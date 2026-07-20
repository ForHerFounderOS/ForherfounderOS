import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getPillars, getWorkstreams, getTasks } from '@/lib/airtable';
import { buildViewModel } from '@/lib/model';
import { formatBriefMessage, formatBriefSubject } from '@/lib/brief';
import { listEventsInRange } from '@/lib/icsCalendar';
import { londonTodayRange } from '@/lib/dates';
import { eventsOnDay } from '@/lib/calendarView';

export const dynamic = 'force-dynamic';

// Vercel Cron schedules run in UTC and don't shift with UK daylight saving,
// so this is triggered twice (see vercel.json) and only actually sends when
// it's really 9am in London — the other firing is a same-day no-op.
function isNineAmLondon(date: Date): boolean {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    hour12: false,
  }).format(date);
  return hour === '9' || hour === '09';
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  // Vercel's real cron firing sends the secret as a header. A query param is
  // also accepted so this can be triggered from a plain browser address bar
  // (no way to set a custom header there) — same secret, just a second way
  // to present it. Don't share a URL containing it; it'll sit in browser
  // history same as any bookmarked secret link.
  const querySecret = req.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;
  const authorized = !!cronSecret && (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // ?dryRun=1 composes and returns the message without sending or requiring
  // it to actually be 9am — useful for testing via `vercel crons run`.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  // ?test=1 bypasses the 9am gate AND actually sends — for confirming
  // RESEND_API_KEY/BRIEF_EMAIL work right now instead of waiting until morning.
  const test = req.nextUrl.searchParams.get('test') === '1';

  if (!dryRun && !test && !isNineAmLondon(now)) {
    return NextResponse.json({
      skipped: true,
      reason: 'Not 9am Europe/London at this firing',
      londonTime: now.toLocaleString('en-GB', { timeZone: 'Europe/London' }),
    });
  }

  try {
    const [pillars, workstreams, tasks] = await Promise.all([getPillars(), getWorkstreams(), getTasks()]);
    const { openTasks, firstMove } = buildViewModel(pillars, workstreams, tasks, []);

    // Calendar is best-effort: if it's unconfigured or a feed has a bad
    // moment, the task-based brief should still go out rather than nothing.
    let calendarEvents: { time: string; label: string }[] = [];
    let calendarError: string | null = null;
    try {
      const { start, end } = londonTodayRange(now);
      const events = await listEventsInRange(start, end);
      calendarEvents = eventsOnDay(events, start);
    } catch (err) {
      calendarError = err instanceof Error ? err.message : String(err);
    }

    const message = formatBriefMessage(firstMove, openTasks, calendarEvents, now);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        message,
        taskCount: openTasks.length,
        calendarEventCount: calendarEvents.length,
        calendarError,
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 });
    }
    // Recipient defaults to Valerie's own address; override with BRIEF_EMAIL
    // if the brief should go elsewhere. RESEND_FROM defaults to Resend's
    // shared sandbox sender, which — without a verified sending domain — can
    // only deliver to the email address the Resend account was created with,
    // and that check is case-sensitive, so this must match exactly.
    const to = process.env.BRIEF_EMAIL || 'valerie.ayeni@icloud.com';
    const from = process.env.RESEND_FROM || 'Founder Command Center <onboarding@resend.dev>';

    const resend = new Resend(apiKey);
    const { data, error: sendError } = await resend.emails.send({
      from,
      to,
      subject: formatBriefSubject(now),
      text: message,
    });

    return NextResponse.json({
      sent: !sendError,
      resend: sendError || data,
      taskCount: openTasks.length,
      calendarEventCount: calendarEvents.length,
      calendarError,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
