// Server-only. Never import this from a Client Component.
import { google, calendar_v3 } from 'googleapis';
import type { DateTime } from 'luxon';

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_CALENDAR_PRIVATE_KEY || '';
  // Vercel's env var UI stores real newlines fine, but some paste paths end
  // up with literal "\n" — normalize either way.
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function getCalendarIds(): string[] {
  return (process.env.GOOGLE_CALENDAR_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function getClient(): calendar_v3.Calendar {
  const email = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const key = getPrivateKey();
  if (!email || !key) throw new Error('GOOGLE_CALENDAR_CLIENT_EMAIL or GOOGLE_CALENDAR_PRIVATE_KEY is not set');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  return google.calendar({ version: 'v3', auth });
}

export type CalEvent = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  allDay: boolean;
  calendarId: string;
};

async function listEventsForCalendar(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<CalEvent[]> {
  const events: CalEvent[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    for (const ev of res.data.items || []) {
      if (!ev.start) continue;
      const allDay = !!ev.start.date;
      const startISO = ev.start.dateTime || `${ev.start.date}T00:00:00`;
      const endISO = ev.end?.dateTime || (ev.end?.date ? `${ev.end.date}T00:00:00` : startISO);
      events.push({
        id: ev.id || `${calendarId}-${startISO}`,
        title: ev.summary || '(untitled)',
        startISO,
        endISO,
        allDay,
        calendarId,
      });
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return events;
}

// Fetches and merges events across every calendar in GOOGLE_CALENDAR_IDS —
// this account has ForHer's Apple Calendar bridged in as several separate
// imported calendars (Work/Home/Eventbrite/Howbout), not one.
export async function listEventsInRange(timeMin: DateTime, timeMax: DateTime): Promise<CalEvent[]> {
  const calendarIds = getCalendarIds();
  if (calendarIds.length === 0) throw new Error('GOOGLE_CALENDAR_IDS is not set');
  const calendar = getClient();
  const timeMinISO = timeMin.toUTC().toISO()!;
  const timeMaxISO = timeMax.toUTC().toISO()!;
  const results = await Promise.all(
    calendarIds.map((id) => listEventsForCalendar(calendar, id, timeMinISO, timeMaxISO))
  );
  return results.flat().sort((a, b) => (a.startISO < b.startISO ? -1 : a.startISO > b.startISO ? 1 : 0));
}
