import { NextResponse } from 'next/server';
import { updateTaskPlannedDate } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

// Lets the standalone Weekly Planner assign an existing open task to a
// specific day immediately — the same Planned Date field the Board
// Meeting's daily planner writes on approval, without going through the
// rest of the meeting form.
export async function POST(req: Request) {
  try {
    const { taskId, date } = await req.json();
    if (!taskId || typeof taskId !== 'string' || !date || typeof date !== 'string') {
      return NextResponse.json({ error: 'taskId and date are required' }, { status: 400 });
    }
    await updateTaskPlannedDate(taskId, date);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
