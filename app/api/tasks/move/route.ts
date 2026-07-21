import { NextResponse } from 'next/server';
import { moveTaskToWorkstream } from '@/lib/airtable';

export async function POST(req: Request) {
  try {
    const { taskId, workstreamId } = await req.json();
    if (!taskId || typeof taskId !== 'string' || !workstreamId || typeof workstreamId !== 'string') {
      return NextResponse.json({ error: 'taskId and workstreamId are required' }, { status: 400 });
    }
    await moveTaskToWorkstream(taskId, workstreamId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
