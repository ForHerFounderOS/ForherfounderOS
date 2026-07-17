import { NextResponse } from 'next/server';
import { getKnowledge } from '@/lib/airtable';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const records = await getKnowledge();
    const notes = records
      .map((r) => ({
        id: r.id,
        text: r.fields.Text || '',
        type: r.fields.Type || '',
        date: r.fields.Date || null,
      }))
      .sort((a, b) => {
        if (a.date && b.date) return a.date < b.date ? 1 : -1;
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });
    return NextResponse.json({ notes });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
