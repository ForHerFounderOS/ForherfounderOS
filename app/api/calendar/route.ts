import { NextResponse } from 'next/server';
import { listEventsInRange } from '@/lib/icsCalendar';
import { londonCalendarWeekRange } from '@/lib/dates';
import { groupByWeek, summarizeWeek } from '@/lib/calendarView';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { start, end } = londonCalendarWeekRange();
    const events = await listEventsInRange(start, end);
    return NextResponse.json({
      days: groupByWeek(events, start),
      summary: summarizeWeek(events, start, end),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
