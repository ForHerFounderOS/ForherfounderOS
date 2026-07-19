import { DateTime } from 'luxon';
import type { CalEvent } from './icsCalendar';

const ZONE = 'Europe/London';

function londonDayKey(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(ZONE).toFormat('yyyy-MM-dd');
}
function londonTime(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(ZONE).toFormat('HH:mm');
}
function minutesSinceMidnight(iso: string): number {
  const dt = DateTime.fromISO(iso, { zone: 'utc' }).setZone(ZONE);
  return dt.hour * 60 + dt.minute;
}

export type ViewCalEvent = { id: string; time: string; label: string; allDay: boolean; protected?: boolean };
export type ViewCalDay = { name: string; dateNum: string; isToday: boolean; events: ViewCalEvent[] };

type ProtectedBlock = { weekday: number; startHour: number; endHour: number; label: string };

// Recovery time deliberately kept clear of ForHer work. A read-only ICS feed
// has no way to carry "and don't book over this," so the app renders these
// itself rather than depending on a real calendar event existing for them.
// Luxon weekday: 1=Mon ... 7=Sun. Adjust the hours here if the real windows shift.
const PROTECTED_BLOCKS: ProtectedBlock[] = [
  { weekday: 3, startHour: 18, endHour: 22, label: 'Protected — recovery' }, // Wed evening
  { weekday: 6, startHour: 12, endHour: 18, label: 'Protected — recovery' }, // Sat afternoon
  { weekday: 7, startHour: 18, endHour: 22, label: 'Protected — recovery' }, // Sun evening
];

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export function groupByWeek(events: CalEvent[], weekStart: DateTime): ViewCalDay[] {
  const todayKey = DateTime.now().setZone(ZONE).toFormat('yyyy-MM-dd');
  const days: ViewCalDay[] = [];
  for (let i = 0; i < 7; i++) {
    const day = weekStart.plus({ days: i });
    const dayKey = day.toFormat('yyyy-MM-dd');

    // All-day events sort first (-1), then everything else by time of day —
    // the protected block included, so it lands wherever it actually falls
    // instead of always pinning to the top of the column.
    const withSortKey: (ViewCalEvent & { sortMinutes: number })[] = events
      .filter((e) => londonDayKey(e.startISO) === dayKey)
      .map((e) => ({
        id: e.id,
        time: e.allDay ? 'All day' : londonTime(e.startISO),
        label: e.title,
        allDay: e.allDay,
        sortMinutes: e.allDay ? -1 : minutesSinceMidnight(e.startISO),
      }));

    const block = PROTECTED_BLOCKS.find((b) => b.weekday === day.weekday);
    if (block) {
      withSortKey.push({
        id: `protected-${dayKey}`,
        time: `${formatHour(block.startHour)}–${formatHour(block.endHour)}`,
        label: block.label,
        allDay: false,
        protected: true,
        sortMinutes: block.startHour * 60,
      });
    }

    withSortKey.sort((a, b) => a.sortMinutes - b.sortMinutes);
    const dayEvents: ViewCalEvent[] = withSortKey.map((e) => ({
      id: e.id,
      time: e.time,
      label: e.label,
      allDay: e.allDay,
      protected: e.protected,
    }));

    days.push({ name: day.toFormat('ccc'), dateNum: day.toFormat('d'), isToday: dayKey === todayKey, events: dayEvents });
  }
  return days;
}

// Honest, computed stats only — the original mock's "Deep work fits twice" /
// "Thursday is heavy" cards were hand-written narrative, not derived from
// anything, so they're not something real calendar data can reproduce.
export type WeekSummary = { totalEvents: number; timedCount: number; allDayCount: number };

export function summarizeWeek(events: CalEvent[], weekStart: DateTime, weekEnd: DateTime): WeekSummary {
  const minISO = weekStart.toUTC().toISO()!;
  const maxISO = weekEnd.toUTC().toISO()!;
  const inWeek = events.filter((e) => e.startISO >= minISO && e.startISO < maxISO);
  return {
    totalEvents: inWeek.length,
    timedCount: inWeek.filter((e) => !e.allDay).length,
    allDayCount: inWeek.filter((e) => e.allDay).length,
  };
}

export function eventsOnDay(events: CalEvent[], day: DateTime): ViewCalEvent[] {
  const dayKey = day.toFormat('yyyy-MM-dd');
  return events
    .filter((e) => londonDayKey(e.startISO) === dayKey)
    .map((e) => ({ id: e.id, time: e.allDay ? 'All day' : londonTime(e.startISO), label: e.title, allDay: e.allDay }));
}

export type BoardMeetingInfo = { weekdayName: string; minutes: number | null; daysUntil: number };

// Finds the next real "Board Meeting" event in the feed (matched by title,
// case-insensitive) so the Sidebar can show its actual day and length
// instead of a hardcoded guess. `now` should already be in London time.
export function findBoardMeeting(events: CalEvent[], now: DateTime): BoardMeetingInfo | null {
  const todayStart = now.startOf('day');
  const next = events
    .filter((e) => /board meeting/i.test(e.title))
    .filter((e) => DateTime.fromISO(e.startISO, { zone: 'utc' }).setZone(ZONE) >= todayStart)
    .sort((a, b) => (a.startISO < b.startISO ? -1 : 1))[0];
  if (!next) return null;

  const start = DateTime.fromISO(next.startISO, { zone: 'utc' }).setZone(ZONE);
  const end = DateTime.fromISO(next.endISO, { zone: 'utc' }).setZone(ZONE);
  const minutes = next.allDay ? null : Math.round(end.diff(start, 'minutes').minutes);
  const daysUntil = Math.floor(start.startOf('day').diff(todayStart, 'days').days);
  return { weekdayName: start.toFormat('cccc'), minutes, daysUntil };
}
