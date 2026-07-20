import { NextResponse } from 'next/server';
import { clearTaskPlannedDate } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

// Sends a task back to the unplanned backlog — clears Planned Date without
// touching Done or anything else about it.
export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }
    await clearTaskPlannedDate(taskId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
