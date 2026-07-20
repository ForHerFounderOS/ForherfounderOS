import { NextResponse } from 'next/server';
import { createTask } from '@/lib/airtable';

// A plain, un-dated task — for adding straight to a workstream (e.g. from
// Home's First Move panel when the priority workstream has caught up)
// without forcing a day assignment the way the Weekly Planner's "create"
// does.
export async function POST(req: Request) {
  try {
    const { workstreamId, text } = await req.json();
    if (!workstreamId || typeof workstreamId !== 'string' || !text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'workstreamId and text are required' }, { status: 400 });
    }
    const record = await createTask(workstreamId, text.trim());
    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
