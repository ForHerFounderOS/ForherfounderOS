import { NextResponse } from 'next/server';
import { setTopPriorityWorkstream } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

// Lets Home's "Change priority" picker write the same Priority Order field
// the Board Meeting writes on approval, without going through the rest of
// the meeting form.
export async function POST(req: Request) {
  try {
    const { workstreamId } = await req.json();
    if (!workstreamId || typeof workstreamId !== 'string') {
      return NextResponse.json({ error: 'workstreamId is required' }, { status: 400 });
    }
    await setTopPriorityWorkstream(workstreamId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
