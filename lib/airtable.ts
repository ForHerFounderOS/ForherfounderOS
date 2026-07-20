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
  Primary?: boolean; // optional — add this checkbox field in Airtable to stop relying on name matching
  Workstreams?: string[];
};
export type WorkstreamFields = {
  Name: string;
  Pillar?: string[];
  Progress?: number; // 0..1
  Tasks?: string[];
  Description?: string;
  'Priority Order'?: number;
};
export type TaskFields = {
  Name: string;
  Workstream?: string[];
  Done?: boolean;
  Deadline?: string; // ISO date
  Estimate?: number; // minutes
  'Earliest Action Date'?: string; // ISO date — task isn't actionable before this
};
export type ParkingLotFields = {
  Item: string;
  'Date added'?: string;
  Status?: string;
};
export type KnowledgeFields = {
  Text: string;
  Type?: string;
  Date?: string;
};

export const TABLES = {
  pillars: 'Pillars',
  workstreams: 'Workstreams',
  tasks: 'Tasks',
  parkingLot: 'Parking Lot',
  knowledge: 'Knowledge',
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
export function getKnowledge() {
  return listAll<KnowledgeFields>(TABLES.knowledge);
}

export function updateTaskDone(id: string, done: boolean) {
  return airtableFetch(`/${encodeURIComponent(TABLES.tasks)}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Done: done }, typecast: true }),
  });
}

export function createTask(workstreamId: string, name: string, deadline?: string | null) {
  const fields: Record<string, unknown> = { Name: name, Workstream: [workstreamId] };
  if (deadline) fields.Deadline = deadline;
  return airtableFetch(`/${encodeURIComponent(TABLES.tasks)}`, {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: true }),
  }) as Promise<AirtableRecord<TaskFields>>;
}

export function updatePillarActive(id: string, active: boolean) {
  return airtableFetch(`/${encodeURIComponent(TABLES.pillars)}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Active: active }, typecast: true }),
  });
}

// The Board Meeting's "one priority" writes here — Priority Order was already
// on Workstreams but unused anywhere in the app. Setting it below the current
// lowest value makes this workstream unambiguously first, without needing to
// renumber every other workstream.
export async function setTopPriorityWorkstream(workstreamId: string) {
  const workstreams = await getWorkstreams();
  const currentMin = workstreams.reduce((min, w) => {
    const order = w.fields['Priority Order'];
    return typeof order === 'number' && order < min ? order : min;
  }, 1);
  const target = workstreams.some((w) => w.id === workstreamId && w.fields['Priority Order'] === currentMin)
    ? currentMin
    : currentMin - 1;
  return airtableFetch(`/${encodeURIComponent(TABLES.workstreams)}/${workstreamId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { 'Priority Order': target }, typecast: true }),
  });
}

// typecast lets Airtable create a new Knowledge "Type" select option on the
// fly (e.g. "Weekly Review") instead of 422-ing when the option doesn't
// already exist in the field's dropdown.
export function createKnowledgeEntry(text: string, type: string) {
  const today = new Date().toISOString().slice(0, 10);
  return airtableFetch(`/${encodeURIComponent(TABLES.knowledge)}`, {
    method: 'POST',
    body: JSON.stringify({ fields: { Text: text, Type: type, Date: today }, typecast: true }),
  });
}

export function createParkingLotItem(text: string) {
  const today = new Date().toISOString().slice(0, 10);
  return airtableFetch(`/${encodeURIComponent(TABLES.parkingLot)}`, {
    method: 'POST',
    body: JSON.stringify({ fields: { Item: text, 'Date added': today }, typecast: true }),
  });
}

export function deleteParkingLotItem(id: string) {
  return airtableFetch(`/${encodeURIComponent(TABLES.parkingLot)}/${id}`, {
    method: 'DELETE',
  });
}
