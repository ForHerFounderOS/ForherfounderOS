import type { ViewTask } from './model';

// SMS body only — Textbelt sends plain text, so no markdown/bold.
export function formatBriefMessage(openTasks: ViewTask[], now: Date = new Date()): string {
  const dayLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/London',
  });

  if (openTasks.length === 0) {
    return `Good morning. Nothing open for ${dayLabel} — a clean slate. — Command Center`;
  }

  const [firstMove, ...restAll] = openTasks;
  const rest = restAll.slice(0, 3);
  const overdueCount = openTasks.filter((t) => t.overdue).length;

  const lines: string[] = [];
  lines.push(`Good morning. Here's ${dayLabel}:`);
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
