import { NextRequest, NextResponse } from 'next/server';
import { getPillars, getWorkstreams, getTasks } from '@/lib/airtable';
import { buildViewModel } from '@/lib/model';
import { formatBriefMessage } from '@/lib/brief';
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
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // ?dryRun=1 composes and returns the message without sending or requiring
  // it to actually be 9am — useful for testing via `vercel crons run`.
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  if (!dryRun && !isNineAmLondon(now)) {
    return NextResponse.json({
      skipped: true,
      reason: 'Not 9am Europe/London at this firing',
      londonTime: now.toLocaleString('en-GB', { timeZone: 'Europe/London' }),
    });
  }

  try {
    const [pillars, workstreams, tasks] = await Promise.all([getPillars(), getWorkstreams(), getTasks()]);
    const { openTasks } = buildViewModel(pillars, workstreams, tasks, []);

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

    const message = formatBriefMessage(openTasks, calendarEvents, now);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        message,
        taskCount: openTasks.length,
        calendarEventCount: calendarEvents.length,
        calendarError,
      });
    }

    const phone = process.env.BRIEF_PHONE;
    const key = process.env.TEXTBELT_KEY;
    if (!phone || !key) {
      return NextResponse.json({ error: 'BRIEF_PHONE or TEXTBELT_KEY is not set' }, { status: 500 });
    }

    const smsRes = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message, key }),
    });
    const smsJson = await smsRes.json();

    return NextResponse.json({
      sent: !!smsJson.success,
      textbelt: smsJson,
      taskCount: openTasks.length,
      calendarEventCount: calendarEvents.length,
      calendarError,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
