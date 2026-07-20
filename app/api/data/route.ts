import { NextResponse } from 'next/server';
import { getPillars, getWorkstreams, getTasks, getParkingLot } from '@/lib/airtable';
import { buildViewModel } from '@/lib/model';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [pillars, workstreams, tasks, parkingLot] = await Promise.all([
      getPillars(),
      getWorkstreams(),
      getTasks(),
      getParkingLot(),
    ]);
    return NextResponse.json(buildViewModel(pillars, workstreams, tasks, parkingLot));
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 502 });
  }
}
