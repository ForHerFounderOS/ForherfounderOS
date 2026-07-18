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

// Plain text email body — no markdown/HTML. Warm but brief, like an
// experienced personal assistant: lead with what matters, no chatter.
// openTasks is expected pre-sorted overdue-first then by soonest deadline
// (see buildViewModel), so openTasks[0] is already the right First Move.
export function formatBriefMessage(
  openTasks: ViewTask[],
  calendarEvents: BriefCalEvent[] = [],
  now: Date = new Date()
): string {
  const lines: string[] = [];
  lines.push('Good morning, Valerie ✦');
  lines.push(dayLabel(now));

  if (calendarEvents.length) {
    lines.push('');
    lines.push("Today's calendar:");
    for (const e of calendarEvents.slice(0, 6)) {
      lines.push(`${e.time} ${e.label}`);
    }
  }

  if (openTasks.length === 0) {
    lines.push('');
    lines.push('Nothing open on the task list — a clean slate.');
    lines.push('');
    lines.push('Here’s to a steady day ahead.');
    return lines.join('\n');
  }

  const [firstMove, ...restAll] = openTasks;
  const rest = restAll.slice(0, 3);
  const overdueTasks = openTasks.filter((t) => t.overdue);

  lines.push('');
  lines.push('First Move:');
  lines.push(
    `${firstMove.label} (${firstMove.pillarName}${
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

  if (overdueTasks.length) {
    lines.push('');
    lines.push('⚠️ Overdue:');
    for (const t of overdueTasks) {
      lines.push(`• ${t.label}`);
    }
  }

  lines.push('');
  lines.push('One thing at a time. You’ve got this.');

  return lines.join('\n');
}
