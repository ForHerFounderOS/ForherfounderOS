import type {
  AirtableRecord,
  PillarFields,
  WorkstreamFields,
  TaskFields,
  ParkingLotFields,
} from './airtable';

const COLORS = ['#A33757', '#9C7222', '#8A4F79', '#4E7B4C', '#DC586D', '#4C6B8A', '#6B7B4E', '#7A4E8A'];
const COLORS_SOFT = ['#B06A93', '#C29D50', '#B37EA4', '#7FAA7C', '#E98A97', '#8CA6BE', '#A8B98C', '#A98CB9'];

export type ViewTask = {
  id: string;
  label: string;
  pillarName: string;
  workstreamName: string;
  done: boolean;
  deadline: string | null; // ISO
  deadlineLabel: string | null;
  overdue: boolean;
};

export type ViewWorkstream = {
  id: string;
  name: string;
  pct: number; // 0..100
  next: string;
  deadlineLabel: string | null;
};

export type ViewPillar = {
  id: string;
  name: string;
  primary: boolean;
  active: boolean;
  color: string;
  colorSoft: string;
  pct: number;
  workstreams: ViewWorkstream[];
};

export type ParkingItem = { id: string; text: string; dateAdded: string | null };

function deadlineLabel(iso: string | null | undefined): { label: string | null; overdue: boolean } {
  if (!iso) return { label: null, overdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Overdue', overdue: true };
  if (diffDays === 0) return { label: 'Due today', overdue: false };
  if (diffDays <= 6) return { label: 'Due ' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }), overdue: false };
  return { label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), overdue: false };
}

// Falls back to matching this name when the Pillars table has no "Primary"
// checkbox field yet. Add a "Primary" checkbox in Airtable and check it on
// ForHer to stop depending on the name match.
const PRIMARY_PILLAR_NAME = 'forher';

function isPrimaryPillar(p: AirtableRecord<PillarFields>, hasPrimaryField: boolean): boolean {
  if (hasPrimaryField) return !!p.fields.Primary;
  return (p.fields.Name || '').trim().toLowerCase() === PRIMARY_PILLAR_NAME;
}

export function buildViewModel(
  pillarRecs: AirtableRecord<PillarFields>[],
  workstreamRecs: AirtableRecord<WorkstreamFields>[],
  taskRecs: AirtableRecord<TaskFields>[],
  parkingRecs: AirtableRecord<ParkingLotFields>[]
) {
  const tasksByWorkstream = new Map<string, AirtableRecord<TaskFields>[]>();
  for (const t of taskRecs) {
    for (const wsId of t.fields.Workstream || []) {
      if (!tasksByWorkstream.has(wsId)) tasksByWorkstream.set(wsId, []);
      tasksByWorkstream.get(wsId)!.push(t);
    }
  }
  const workstreamsByPillar = new Map<string, AirtableRecord<WorkstreamFields>[]>();
  for (const w of workstreamRecs) {
    for (const pId of w.fields.Pillar || []) {
      if (!workstreamsByPillar.has(pId)) workstreamsByPillar.set(pId, []);
      workstreamsByPillar.get(pId)!.push(w);
    }
  }
  const workstreamById = new Map(workstreamRecs.map((w) => [w.id, w]));
  const pillarById = new Map(pillarRecs.map((p) => [p.id, p]));

  function pickNext(tasks: AirtableRecord<TaskFields>[]) {
    const open = tasks.filter((t) => !t.fields.Done);
    if (open.length === 0) return null;
    open.sort((a, b) => {
      const da = a.fields.Deadline,
        db = b.fields.Deadline;
      if (da && db) return da < db ? -1 : da > db ? 1 : 0;
      if (da) return -1;
      if (db) return 1;
      return a.createdTime < b.createdTime ? -1 : 1;
    });
    return open[0];
  }

  const hasPrimaryField = pillarRecs.some((p) => typeof p.fields.Primary === 'boolean');

  const pillars: ViewPillar[] = pillarRecs.map((p, i) => {
    const workstreams = workstreamsByPillar.get(p.id) || [];
    const wsView: ViewWorkstream[] = workstreams.map((w) => {
      const tasks = tasksByWorkstream.get(w.id) || [];
      const pct =
        typeof w.fields.Progress === 'number'
          ? Math.round(w.fields.Progress * 100)
          : tasks.length
          ? Math.round((tasks.filter((t) => t.fields.Done).length / tasks.length) * 100)
          : 0;
      const next = pickNext(tasks);
      const dl = deadlineLabel(next?.fields.Deadline);
      return {
        id: w.id,
        name: w.fields.Name,
        pct,
        next: next ? next.fields.Name : 'All caught up here',
        deadlineLabel: dl.label,
      };
    });
    const pct =
      typeof p.fields.Progress === 'number'
        ? Math.round(p.fields.Progress * 100)
        : wsView.length
        ? Math.round(wsView.reduce((a, w) => a + w.pct, 0) / wsView.length)
        : 0;
    return {
      id: p.id,
      name: p.fields.Name,
      primary: isPrimaryPillar(p, hasPrimaryField),
      active: !!p.fields.Active,
      color: COLORS[i % COLORS.length],
      colorSoft: COLORS_SOFT[i % COLORS_SOFT.length],
      pct,
      workstreams: wsView,
    };
  });

  const openTasks: ViewTask[] = taskRecs
    .filter((t) => !t.fields.Done)
    .map((t) => {
      const wsId = (t.fields.Workstream || [])[0];
      const ws = wsId ? workstreamById.get(wsId) : undefined;
      const pId = ws ? (ws.fields.Pillar || [])[0] : undefined;
      const pillar = pId ? pillarById.get(pId) : undefined;
      const dl = deadlineLabel(t.fields.Deadline);
      return {
        id: t.id,
        label: t.fields.Name,
        pillarName: pillar?.fields.Name || 'Unassigned',
        workstreamName: ws?.fields.Name || '',
        done: false,
        deadline: t.fields.Deadline || null,
        deadlineLabel: dl.label,
        overdue: dl.overdue,
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1;
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  const parkingLot: ParkingItem[] = parkingRecs
    .slice()
    .sort((a, b) => (a.createdTime < b.createdTime ? 1 : -1))
    .map((p) => ({ id: p.id, text: p.fields.Item, dateAdded: p.fields['Date added'] || null }));

  const completed = taskRecs.filter((t) => t.fields.Done).length;
  const overdue = taskRecs.filter((t) => !t.fields.Done && deadlineLabel(t.fields.Deadline).overdue).length;
  const stats = {
    total: taskRecs.length,
    completed,
    open: taskRecs.length - completed,
    overdue,
  };

  // Tasks with a deadline falling in the current calendar month — a real,
  // computed "this month" measure rather than a made-up percentage.
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthTasks = taskRecs.filter((t) => t.fields.Deadline?.slice(0, 7) === currentMonthKey);
  const monthly = {
    total: monthTasks.length,
    completed: monthTasks.filter((t) => t.fields.Done).length,
  };

  return { pillars, openTasks, parkingLot, stats, monthly };
}
