import { NextResponse } from 'next/server';
import { updateTaskDone } from '@/lib/airtable';

export async function POST(req: Request) {
  try {
    const { id, done } = await req.json();
    if (!id || typeof done !== 'boolean') {
      return NextResponse.json({ error: 'id and done are required' }, { status: 400 });
    }
    await updateTaskDone(id, done);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
