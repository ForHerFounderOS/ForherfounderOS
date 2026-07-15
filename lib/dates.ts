import { DateTime } from 'luxon';

const ZONE = 'Europe/London';

export function londonNow(base: Date = new Date()): DateTime {
  return DateTime.fromJSDate(base, { zone: ZONE });
}

export function londonTodayRange(base: Date = new Date()): { start: DateTime; end: DateTime } {
  const start = londonNow(base).startOf('day');
  return { start, end: start.plus({ days: 1 }) };
}

// Monday through end-of-Friday, in London local time.
export function londonWorkWeekRange(base: Date = new Date()): { start: DateTime; end: DateTime } {
  const start = londonNow(base).startOf('week');
  return { start, end: start.plus({ days: 5 }) };
}
