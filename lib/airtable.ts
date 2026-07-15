// Server-only. Never import this from a Client Component.
const API_BASE = process.env.AIRTABLE_API_BASE || 'https://api.airtable.com/v0';

function baseId(): string {
  const id = process.env.AIRTABLE_BASE_ID;
  if (!id) throw new Error('AIRTABLE_BASE_ID is not set');
  return id;
}

function token(): string {
  const t = process.env.AIRTABLE_TOKEN;
  if (!t) throw new Error('AIRTABLE_TOKEN is not set');
  return t;
}

async function airtableFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}/${baseId()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Airtable ${res.status} ${path}: ${body}`);
  }
  return res.json();
}

export type AirtableRecord<F> = { id: string; createdTime: string; fields: F };

async function listAll<F>(table: string): Promise<AirtableRecord<F>[]> {
  const records: AirtableRecord<F>[] = [];
  let offset: string | undefined;
  do {
    const qs = offset ? `?pageSize=100&offset=${offset}` : '?pageSize=100';
    const page = await airtableFetch(`/${encodeURIComponent(table)}${qs}`);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

export type PillarFields = {
  Name: string;
  Progress?: number; // 0..1
  Active?: boolean;
  Workstreams?: string[];
};
export type WorkstreamFields = {
  Name: string;
  Pillar?: string[];
  Progress?: number; // 0..1
  Tasks?: string[];
  Description?: string;
};
export type TaskFields = {
  Name: string;
  Workstream?: string[];
  Done?: boolean;
  Deadline?: string; // ISO date
  Estimate?: number; // minutes
};
export type ParkingLotFields = {
  Item: string;
  'Date added'?: string;
  Status?: string;
};

export const TABLES = {
  pillars: 'Pillars',
  workstreams: 'Workstreams',
  tasks: 'Tasks',
  parkingLot: 'Parking Lot',
} as const;

export function getPillars() {
  return listAll<PillarFields>(TABLES.pillars);
}
export function getWorkstreams() {
  return listAll<WorkstreamFields>(TABLES.workstreams);
}
export function getTasks() {
  return listAll<TaskFields>(TABLES.tasks);
}
export function getParkingLot() {
  return listAll<ParkingLotFields>(TABLES.parkingLot);
}

export function updateTaskDone(id: string, done: boolean) {
  return airtableFetch(`/${encodeURIComponent(TABLES.tasks)}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Done: done } }),
  });
}

export function updatePillarActive(id: string, active: boolean) {
  return airtableFetch(`/${encodeURIComponent(TABLES.pillars)}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Active: active } }),
  });
}

export function createParkingLotItem(text: string) {
  const today = new Date().toISOString().slice(0, 10);
  return airtableFetch(`/${encodeURIComponent(TABLES.parkingLot)}`, {
    method: 'POST',
    body: JSON.stringify({ fields: { Item: text, 'Date added': today } }),
  });
}

export function deleteParkingLotItem(id: string) {
  return airtableFetch(`/${encodeURIComponent(TABLES.parkingLot)}/${id}`, {
    method: 'DELETE',
  });
}
