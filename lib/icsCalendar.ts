// Server-only. Never import this from a Client Component.
//
// These calendars are subscribed into Google via webcal (ICS) import, not
// owned by the Google account — Google doesn't expose "share with specific
// people" for imported calendars, so a service account can't read them.
// Instead this reads each calendar's own ICS feed URL directly (the feed
// URL itself is the credential — treat it like a secret).
import ical from 'node-ical';
import type { DateTime } from 'luxon';

function getFeedUrls(): string[] {
  return (process.env.CALENDAR_ICS_URLS || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (u.startsWith('webcal://') ? 'https://' + u.slice('webcal://'.length) : u));
}

export type CalEvent = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  allDay: boolean;
  calendarId: string;
};

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function overlapsRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return start < rangeEnd && end > rangeStart;
}

function expandEvent(event: ical.VEvent, rangeStart: Date, rangeEnd: Date, calendarId: string): CalEvent[] {
  const allDay = event.datetype === 'date';
  const out: CalEvent[] = [];

  if (!event.rrule) {
    if (overlapsRange(event.start, event.end, rangeStart, rangeEnd)) {
      out.push({
        id: `${calendarId}-${event.uid}`,
        title: event.summary || '(untitled)',
        startISO: event.start.toISOString(),
        endISO: event.end.toISOString(),
        allDay,
        calendarId,
      });
    }
    return out;
  }

  // Recurring: expand occurrences overlapping the range, honoring
  // per-occurrence exceptions (EXDATE) and overrides (RECURRENCE-ID).
  const durationMs = event.end.getTime() - event.start.getTime();
  const occurrences = event.rrule.between(rangeStart, rangeEnd, true);
  for (const occStart of occurrences) {
    const key = dateKey(occStart);
    if (event.exdate?.[key]) continue;

    const override = event.recurrences?.[key];
    const start = override ? override.start : occStart;
    const end = override ? override.end : new Date(occStart.getTime() + durationMs);
    if (!overlapsRange(start, end, rangeStart, rangeEnd)) continue;

    out.push({
      id: `${calendarId}-${event.uid}-${key}`,
      title: (override ? override.summary : event.summary) || '(untitled)',
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      allDay: override ? override.datetype === 'date' : allDay,
      calendarId,
    });
  }
  return out;
}

// node-ical's fromURL types collapse to a void-returning overload as soon as
// a second argument is passed (even just fetch options), so the timeout is
// enforced here instead of via its options.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function listEventsFromFeed(url: string, calendarId: string, rangeStart: Date, rangeEnd: Date): Promise<CalEvent[]> {
  const data = await withTimeout(ical.async.fromURL(url), 15000);
  const events: CalEvent[] = [];
  for (const key of Object.keys(data)) {
    const item = data[key];
    if (!item || item.type !== 'VEVENT') continue;
    events.push(...expandEvent(item, rangeStart, rangeEnd, calendarId));
  }
  return events;
}

// Fetches and merges events across every feed in CALENDAR_ICS_URLS — this
// account has ForHer's Apple Calendar bridged in as several separate
// subscribed feeds (Work/Home/Eventbrite/Howbout), not one. A single bad or
// slow feed doesn't take the others down — only if every feed fails do we
// surface an error, matching how callers already treat calendar data as
// best-effort.
export async function listEventsInRange(timeMin: DateTime, timeMax: DateTime): Promise<CalEvent[]> {
  const urls = getFeedUrls();
  if (urls.length === 0) throw new Error('CALENDAR_ICS_URLS is not set');
  const rangeStart = timeMin.toUTC().toJSDate();
  const rangeEnd = timeMax.toUTC().toJSDate();

  const settled = await Promise.allSettled(
    urls.map((url, i) => listEventsFromFeed(url, `cal${i}`, rangeStart, rangeEnd))
  );

  const events: CalEvent[] = [];
  const failures: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') events.push(...result.value);
    else failures.push(`feed ${i + 1}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  });

  if (failures.length === urls.length) {
    throw new Error(`All calendar feeds failed: ${failures.join('; ')}`);
  }

  return events.sort((a, b) => (a.startISO < b.startISO ? -1 : a.startISO > b.startISO ? 1 : 0));
}
