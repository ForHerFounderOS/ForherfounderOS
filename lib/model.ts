import type {
  AirtableRecord,
  PillarFields,
  WorkstreamFields,
  TaskFields,
  ParkingLotFields,
} from './airtable';

const COLORS = ['#A33757', '#9C7222', '#8A4F79', '#4E7B4C', '#DC586D', '#4C6B8A', '#6B7B4E', '#7A4E8A'];
const COLORS_SOFT = ['#B06A93', '#C29D50', '#B37EA4', '#7FAA7C', '#E98A97', '#8CA6BE', '#A8B98C', '#A98CB9'];

// The same shape backs both the day-to-day open task list and the
// Monthly/Quarterly breakdowns — a task means the same thing everywhere,
// so clicking into one always shows the same real context: what it's part
// of, whether it's actually the thing holding that workstream up, and when
// it's really due.
export type ViewTask = {
  id: string;
  label: string;
  pillarName: string;
  workstreamId: string | null;
  workstreamName: string;
  workstreamDescription: string | null;
  isNext: boolean;
  blockedByLabel: string | null;
  done: boolean;
  deadline: string | null; // ISO
  deadlineLabel: string | null;
  overdue: boolean;
  earliestActionDate: string | null; // ISO
  notYetActionable: boolean;
  notYetActionableLabel: string | null;
  plannedDate: string | null; // ISO — assigned at the Board Meeting's daily planner
  plannedDateLabel: string | null;
};

export type ViewWorkstream = {
  id: string;
  name: string;
  description: string | null;
  pct: number; // 0..100
  next: string;
  deadlineLabel: string | null;
  // Every task in this workstream, done or not, actionable or not — the
  // real backing list for the workstream's own detail view, so a task
  // gated by Earliest Action Date is deferred, not lost.
  tasks: ViewTask[];
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

export type ViewPriority = { workstreamId: string; workstreamName: string; task: ViewTask | null };

export type PeriodTask = ViewTask;
export type PeriodStats = { total: number; completed: number; items: PeriodTask[] };

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

// Local wall-clock date, not UTC — matches how deadlineLabel already
// compares "today" elsewhere in this file.
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function notYetActionableLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return `Not yet actionable — opens ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function plannedDateLabelFor(iso: string | null, todayStr: string): string | null {
  if (!iso) return null;
  if (iso === todayStr) return 'Planned for today';
  const d = new Date(iso + 'T00:00:00');
  return `Planned ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
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
  const todayStr = todayDateStr();

  function isActionable(t: AirtableRecord<TaskFields>): boolean {
    const ead = t.fields['Earliest Action Date'];
    return !ead || ead <= todayStr;
  }

  // Tasks gated by a future Earliest Action Date are excluded from "next"
  // and from the open task list entirely — deferred, not just deprioritized.
  // Once that date passes they're filtered back in here with zero special
  // treatment, competing on Deadline exactly like anything else.
  function pickNext(tasks: AirtableRecord<TaskFields>[]) {
    const open = tasks.filter((t) => !t.fields.Done && isActionable(t));
    if (open.length === 0) return null;
    open.sort((a, b) => {
      const da = a.fields.Deadline,
        db = b.fields.Deadline;
      if (da && db) return da < db ? -1 : da > db ? 1 : 0;
      if (da) return -1;
      if (db) return 1;
      // No deadline on either: the most recently created task wins, since
      // that's the one most likely to reflect the latest decision — an old
      // task with no deadline shouldn't keep outranking one just created.
      return a.createdTime > b.createdTime ? -1 : 1;
    });
    return open[0];
  }

  // Computed once so every view (today's list, First Move, the Monthly and
  // Quarterly breakdowns) agrees on what's actually next in each workstream —
  // and therefore on what a given task is, or isn't, blocking.
  const nextTaskByWorkstream = new Map<string, AirtableRecord<TaskFields> | null>();
  for (const w of workstreamRecs) {
    nextTaskByWorkstream.set(w.id, pickNext(tasksByWorkstream.get(w.id) || []));
  }

  function taskContext(t: AirtableRecord<TaskFields>) {
    const wsId = (t.fields.Workstream || [])[0];
    const ws = wsId ? workstreamById.get(wsId) : undefined;
    const pId = ws ? (ws.fields.Pillar || [])[0] : undefined;
    const pillar = pId ? pillarById.get(pId) : undefined;
    const next = wsId ? nextTaskByWorkstream.get(wsId) : undefined;
    const isNext = !!next && next.id === t.id;
    return {
      pillarName: pillar?.fields.Name || 'Unassigned',
      workstreamId: wsId || null,
      workstreamName: ws?.fields.Name || '',
      workstreamDescription: ws?.fields.Description || null,
      isNext,
      blockedByLabel: !isNext && next ? next.fields.Name : null,
    };
  }

  function toViewTask(t: AirtableRecord<TaskFields>): ViewTask {
    const dl = deadlineLabel(t.fields.Deadline);
    const earliestActionDate = t.fields['Earliest Action Date'] || null;
    const notYetActionable = !isActionable(t);
    const plannedDate = t.fields['Planned Date'] || null;
    return {
      id: t.id,
      label: t.fields.Name,
      done: !!t.fields.Done,
      deadline: t.fields.Deadline || null,
      deadlineLabel: dl.label,
      overdue: dl.overdue,
      earliestActionDate,
      notYetActionable,
      notYetActionableLabel: notYetActionable ? notYetActionableLabel(earliestActionDate) : null,
      plannedDate,
      plannedDateLabel: plannedDateLabelFor(plannedDate, todayStr),
      ...taskContext(t),
    };
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
      const next = nextTaskByWorkstream.get(w.id) || null;
      const dl = deadlineLabel(next?.fields.Deadline);
      // Open + actionable first (overdue, then soonest deadline), then
      // not-yet-actionable (soonest to open first), then done last — so the
      // workstream's own detail view reads the same way the rest of the app
      // orders tasks, with deferred ones visible but clearly out of the way.
      const tasksView = tasks
        .map(toViewTask)
        .sort((a, b) => {
          const rank = (t: ViewTask) => (t.done ? 2 : t.notYetActionable ? 1 : 0);
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          if (ra === 1) return (a.earliestActionDate || '') < (b.earliestActionDate || '') ? -1 : 1;
          if (ra === 0) {
            if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
            if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1;
            if (a.deadline) return -1;
            if (b.deadline) return 1;
          }
          return 0;
        });
      return {
        id: w.id,
        name: w.fields.Name,
        description: w.fields.Description || null,
        pct,
        next: next ? next.fields.Name : 'All caught up here',
        deadlineLabel: dl.label,
        tasks: tasksView,
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

  // First Move: the next task in whichever workstream carries the lowest
  // Priority Order among active pillars — a real Airtable field the Board
  // Meeting writes to on approval, not something living only in the
  // browser. Nothing set anywhere yet means no priority has been chosen.
  const activePillarIds = new Set(pillars.filter((p) => p.primary || p.active).map((p) => p.id));
  const prioritizedWorkstreams = workstreamRecs
    .filter((w) => typeof w.fields['Priority Order'] === 'number')
    .filter((w) => (w.fields.Pillar || []).some((pId) => activePillarIds.has(pId)))
    .sort((a, b) => (a.fields['Priority Order'] as number) - (b.fields['Priority Order'] as number));
  const topWorkstream = prioritizedWorkstreams[0] || null;
  const topTask = topWorkstream ? nextTaskByWorkstream.get(topWorkstream.id) : null;
  const firstMove: ViewTask | null = topTask ? toViewTask(topTask) : null;
  // Distinct from firstMove: a priority can be set and still have no open
  // task in that workstream (everything done, or nothing added yet). The UI
  // needs to tell those two "nothing to show" cases apart.
  const priorityWorkstreamId: string | null = topWorkstream ? topWorkstream.id : null;
  const priorityWorkstreamName: string | null = topWorkstream ? topWorkstream.fields.Name : null;

  // The ranked list behind First Move, not just its head — so the app can
  // show "this week's priorities" as more than one workstream at a time
  // without changing what strictly wins the top slot.
  const priorities: ViewPriority[] = prioritizedWorkstreams.slice(0, 5).map((w) => {
    const t = nextTaskByWorkstream.get(w.id);
    return { workstreamId: w.id, workstreamName: w.fields.Name, task: t ? toViewTask(t) : null };
  });

  const openTasks: ViewTask[] = taskRecs
    .filter((t) => !t.fields.Done && isActionable(t))
    .map(toViewTask)
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1;
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  // What's actually queued for today — assigned a Planned Date at the Board
  // Meeting's daily planner, not just "somewhere in the open backlog." This
  // is what Home's "Rest of today" and the Daily Briefing should show;
  // openTasks above stays the full backlog for Company Review, Progress, etc.
  const todayPlan: ViewTask[] = openTasks.filter((t) => t.plannedDate === todayStr);

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

  // Tasks whose Deadline falls within a given period — the real, computed
  // basis for the Monthly/Quarterly progress meters, not a made-up number.
  function periodStats(matchesPeriod: (deadline: string) => boolean): PeriodStats {
    const items: PeriodTask[] = taskRecs
      .filter((t) => t.fields.Deadline && matchesPeriod(t.fields.Deadline))
      .map(toViewTask)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return 0;
      });
    return { total: items.length, completed: items.filter((i) => i.done).length, items };
  }

  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const monthly = periodStats((d) => d.slice(0, 7) === currentMonthKey);
  const quarterly = periodStats((d) => {
    const [y, m] = d.split('-');
    return Number(y) === now.getFullYear() && Math.ceil(Number(m) / 3) === currentQuarter;
  });

  return {
    pillars,
    openTasks,
    todayPlan,
    parkingLot,
    stats,
    monthly,
    quarterly,
    firstMove,
    priorityWorkstreamId,
    priorityWorkstreamName,
    priorities,
  };
}
