import { NextResponse } from 'next/server';
import { listEventsInRange } from '@/lib/googleCalendar';
import { londonWorkWeekRange } from '@/lib/dates';
import { groupByWorkWeek, summarizeWeek } from '@/lib/calendarView';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { start, end } = londonWorkWeekRange();
    const events = await listEventsInRange(start, end);
    return NextResponse.json({
      days: groupByWorkWeek(events, start),
      summary: summarizeWeek(events, start, end),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
