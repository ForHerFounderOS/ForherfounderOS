import { DateTime } from 'luxon';
import type { CalEvent } from './icsCalendar';

const ZONE = 'Europe/London';

function londonDayKey(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(ZONE).toFormat('yyyy-MM-dd');
}
function londonTime(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(ZONE).toFormat('HH:mm');
}

export type ViewCalEvent = { id: string; time: string; label: string; allDay: boolean };
export type ViewCalDay = { name: string; dateNum: string; isToday: boolean; events: ViewCalEvent[] };

export function groupByWorkWeek(events: CalEvent[], weekStart: DateTime): ViewCalDay[] {
  const todayKey = DateTime.now().setZone(ZONE).toFormat('yyyy-MM-dd');
  const days: ViewCalDay[] = [];
  for (let i = 0; i < 5; i++) {
    const day = weekStart.plus({ days: i });
    const dayKey = day.toFormat('yyyy-MM-dd');
    const dayEvents = events
      .filter((e) => londonDayKey(e.startISO) === dayKey)
      .map((e) => ({ id: e.id, time: e.allDay ? 'All day' : londonTime(e.startISO), label: e.title, allDay: e.allDay }));
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
