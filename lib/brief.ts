import type { ViewTask } from './model';

export type BriefCalEvent = { time: string; label: string };

function dayLabel(now: Date): string {
  return now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/London',
  });
}

export function formatBriefSubject(now: Date = new Date()): string {
  return `Your daily brief — ${dayLabel(now)}`;
}

// Plain text email body — no markdown/HTML, matches the terse, no-fuss tone.
export function formatBriefMessage(
  openTasks: ViewTask[],
  calendarEvents: BriefCalEvent[] = [],
  now: Date = new Date()
): string {
  const lines: string[] = [];
  lines.push(`Good morning. Here's ${dayLabel(now)}:`);
  lines.push('');

  if (calendarEvents.length) {
    lines.push("Today's calendar:");
    for (const e of calendarEvents.slice(0, 6)) {
      lines.push(`${e.time} ${e.label}`);
    }
  } else {
    lines.push("Today's calendar: nothing scheduled.");
  }

  if (openTasks.length === 0) {
    lines.push('');
    lines.push('Nothing open on the task list — a clean slate.');
    lines.push('');
    lines.push('One thing at a time. You’ve got this.');
    return lines.join('\n');
  }

  const [firstMove, ...restAll] = openTasks;
  const rest = restAll.slice(0, 3);
  const overdueCount = openTasks.filter((t) => t.overdue).length;

  lines.push('');
  lines.push(
    `First move: ${firstMove.label} (${firstMove.pillarName}${
      firstMove.workstreamName ? ' · ' + firstMove.workstreamName : ''
    })${firstMove.deadlineLabel ? ' — ' + firstMove.deadlineLabel : ''}`
  );

  if (rest.length) {
    lines.push('');
    lines.push('Also today:');
    for (const t of rest) {
      lines.push(`• ${t.label}${t.deadlineLabel ? ' — ' + t.deadlineLabel : ''}`);
    }
  }

  if (overdueCount > 0) {
    lines.push('');
    lines.push(overdueCount === 1 ? '⚠ 1 task is overdue.' : `⚠ ${overdueCount} tasks are overdue.`);
  }

  lines.push('');
  lines.push('One thing at a time. You’ve got this.');

  return lines.join('\n');
}
