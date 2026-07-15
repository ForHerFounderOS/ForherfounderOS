import { NextResponse } from 'next/server';
import { updatePillarActive } from '@/lib/airtable';

export async function POST(req: Request) {
  try {
    const { id, active } = await req.json();
    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'id and active are required' }, { status: 400 });
    }
    await updatePillarActive(id, active);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
