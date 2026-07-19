import { NextResponse } from 'next/server';
import { createTask, updateTaskDone, createKnowledgeEntry, setTopPriorityWorkstream } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

type OutcomeInput = { text: string; done: boolean; workstreamId: string | null; taskId: string | null };
type DecisionInput = { id: number; text: string; recorded?: boolean };

// This is the one place the Board Meeting actually changes the business,
// rather than just recording notes about it: real Task rows get created
// or completed, the chosen priority becomes a real Airtable field (so
// First Move is never just something sitting in browser storage), and
// decisions land in Knowledge instead of staying in this week's form.
// Each step is independent — one failing doesn't block the rest — and
// failures are reported back rather than silently dropped.
export async function POST(req: Request) {
  const body = await req.json();
  const outcomes: OutcomeInput[] = Array.isArray(body.outcomes) ? body.outcomes : [];
  const decisions: DecisionInput[] = Array.isArray(body.decisions) ? body.decisions : [];
  const priorityWorkstreamId: string | null = body.priorityWorkstreamId || null;
  const wins: string[] = Array.isArray(body.wins) ? body.wins : [];
  const planRecovery: string = body.planRecovery || '';
  const isNewDay: boolean = !!body.isNewDay;

  const errors: string[] = [];

  const outcomeTaskIds: (string | null)[] = [];
  for (const o of outcomes) {
    let taskId = o.taskId;
    try {
      if (!taskId && o.text.trim() && o.workstreamId) {
        const rec = await createTask(o.workstreamId, o.text.trim());
        taskId = rec.id;
      }
      if (taskId && o.done) {
        await updateTaskDone(taskId, true);
      }
    } catch (err) {
      errors.push(`Outcome "${o.text}": ${err instanceof Error ? err.message : String(err)}`);
    }
    outcomeTaskIds.push(taskId);
  }

  const decisionsRecorded: number[] = [];
  for (const d of decisions) {
    if (d.recorded || !d.text.trim()) continue;
    try {
      await createKnowledgeEntry(d.text.trim(), 'Decision');
      decisionsRecorded.push(d.id);
    } catch (err) {
      errors.push(`Decision "${d.text}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let weeklyReviewCreated = false;
  const hasWins = wins.some((w) => w.trim());
  if (isNewDay && (hasWins || planRecovery.trim())) {
    try {
      const lines = [
        hasWins ? `Wins: ${wins.filter((w) => w.trim()).join(' · ')}` : null,
        planRecovery.trim() ? `Recovery: ${planRecovery.trim()}` : null,
      ].filter((l): l is string => !!l);
      await createKnowledgeEntry(lines.join('\n'), 'Weekly Review');
      weeklyReviewCreated = true;
    } catch (err) {
      errors.push(`Weekly review: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let priorityUpdated = false;
  if (priorityWorkstreamId) {
    try {
      await setTopPriorityWorkstream(priorityWorkstreamId);
      priorityUpdated = true;
    } catch (err) {
      errors.push(`Priority: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ outcomeTaskIds, decisionsRecorded, weeklyReviewCreated, priorityUpdated, errors });
}
