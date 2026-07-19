import { NextResponse } from 'next/server';
import { listEventsInRange } from '@/lib/icsCalendar';
import { londonNow } from '@/lib/dates';
import { findBoardMeeting } from '@/lib/calendarView';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = londonNow();
    // 9 days comfortably covers "the next weekly occurrence" even when
    // today's own occurrence has already passed.
    const start = now.startOf('day');
    const end = start.plus({ days: 9 });
    const events = await listEventsInRange(start, end);
    return NextResponse.json({ info: findBoardMeeting(events, now) });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
