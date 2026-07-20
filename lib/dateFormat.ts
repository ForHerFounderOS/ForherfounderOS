function ordinalSuffix(day: number): string {
  if (day % 10 === 1 && day % 100 !== 11) return 'st';
  if (day % 10 === 2 && day % 100 !== 12) return 'nd';
  if (day % 10 === 3 && day % 100 !== 13) return 'rd';
  return 'th';
}

// The app's one "full date" format — "Monday 20th July" — used anywhere a
// day is spelled out in full (page headers, email greetings, deadline
// sentences). Pass timeZone for a specific zone (the daily brief cron,
// which doesn't run in Europe/London); omit it to use the runtime's local
// time, matching how the rest of the app already treats "today."
export function formatLongDate(d: Date, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : {};
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', ...opts });
  const month = d.toLocaleDateString('en-GB', { month: 'long', ...opts });
  const day = Number(d.toLocaleDateString('en-GB', { day: 'numeric', ...opts }));
  return `${weekday} ${day}${ordinalSuffix(day)} ${month}`;
}
