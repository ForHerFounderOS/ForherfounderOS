import { NextResponse } from 'next/server';
import { createParkingLotItem, deleteParkingLotItem } from '@/lib/airtable';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    const record = await createParkingLotItem(text.trim());
    return NextResponse.json({ id: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await deleteParkingLotItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
