import { NextResponse } from 'next/server';
import { createTask } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

// Creates a brand-new task already planned for a specific day — for
// something that doesn't exist as an open task yet but belongs on the
// week, not just "someday."
export async function POST(req: Request) {
  try {
    const { workstreamId, text, date } = await req.json();
    if (!workstreamId || typeof workstreamId !== 'string' || !text || typeof text !== 'string' || !date || typeof date !== 'string') {
      return NextResponse.json({ error: 'workstreamId, text, and date are required' }, { status: 400 });
    }
    const record = await createTask(workstreamId, text.trim(), undefined, date);
    return NextResponse.json({ ok: true, id: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
