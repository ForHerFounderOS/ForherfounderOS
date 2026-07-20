'use client';

import { useEffect, useRef, useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar, ViewTask, ViewWorkstream, ViewPriority } from '@/lib/model';
import type { ViewCalDay } from '@/lib/calendarView';
import { formatLongDate } from '@/lib/dateFormat';
import TaskDetailModal from './TaskDetail';
import WorkstreamDetailModal from './WorkstreamDetail';

const GREETING_NAME = '';

function greetingText() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return GREETING_NAME ? `${g}, ${GREETING_NAME}.` : `${g}.`;
}
function todayLineText() {
  return formatLongDate(new Date());
}

const badgeStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#8F5A12',
  background: '#F6E8CF',
  border: '1px solid #E8D3A8',
  padding: '2px 8px',
  borderRadius: 99,
  flexShrink: 0,
};

type EnergyLevel = 'low' | 'medium' | 'high';
type EnergyEntry = { date: string; level: EnergyLevel };

const ENERGY_STORAGE_KEY = 'fcc-energy-log';
const ENERGY_HISTORY_DAYS = 14;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadEnergyLog(): EnergyEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ENERGY_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveEnergyLog(log: EnergyEntry[]) {
  try {
    localStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(log.slice(-ENERGY_HISTORY_DAYS)));
  } catch {}
}

// How many consecutive days, ending today, were logged "low" — used to scale
// down how much the dashboard shows rather than just reacting to one bad day.
function lowStreakEndingToday(log: EnergyEntry[]): number {
  const byDate = new Map(log.map((e) => [e.date, e.level]));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    if (byDate.get(dateKey(cursor)) !== 'low') break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type Snapshot = { workstreamPct: Record<string, number>; completedCount: number };
const SNAPSHOT_KEY = 'fcc-last-visit-snapshot';

function loadSnapshot(): Snapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}

function saveSnapshot(s: Snapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
  } catch {}
}

export default function Home({
  pillars,
  openTasks,
  todayPlan,
  stats,
  loading,
  error,
  onToggleTask,
  firstMove,
  priorityWorkstreamId,
  priorityWorkstreamName,
  priorities,
  refresh,
}: {
  pillars: ViewPillar[];
  openTasks: ViewTask[];
  todayPlan: ViewTask[];
  stats: { total: number; completed: number; open: number; overdue: number };
  loading: boolean;
  error: string | null;
  onToggleTask: (id: string) => void;
  firstMove: ViewTask | null;
  priorityWorkstreamId: string | null;
  priorityWorkstreamName: string | null;
  priorities: ViewPriority[];
  refresh: () => void;
}) {
  const [restOpen, setRestOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [energyLog, setEnergyLog] = useState<EnergyEntry[]>([]);
  const [selectedTask, setSelectedTask] = useState<ViewTask | null>(null);
  const [selectedWorkstream, setSelectedWorkstream] = useState<{ workstream: ViewWorkstream; pillarName: string; pillarColor: string } | null>(null);
  const [lastVisit, setLastVisit] = useState<Snapshot | null>(null);
  const [lastVisitLoaded, setLastVisitLoaded] = useState(false);
  const [todayCalMinutes, setTodayCalMinutes] = useState<number | null>(null);
  const [priorityChanging, setPriorityChanging] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const snapshotSaved = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnergyLog(loadEnergyLog());
    setLastVisit(loadSnapshot());
    setLastVisitLoaded(true);
  }, []);

  useEffect(() => {
    // Real calendar load, not a guess — a day stacked with lectures or a work
    // shift should visibly shrink what "Rest of today" suggests, the same way
    // low energy already does.
    let cancelled = false;
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((json: { days?: ViewCalDay[] }) => {
        if (cancelled || !json.days) return;
        const today = json.days.find((d) => d.isToday);
        const minutes = today
          ? today.events.reduce((sum, e) => (e.allDay ? sum : sum + (e.durationMinutes || 0)), 0)
          : null;
        setTodayCalMinutes(minutes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!lastVisitLoaded || loading || error || snapshotSaved.current) return;
    snapshotSaved.current = true;
    saveSnapshot({
      workstreamPct: Object.fromEntries(pillars.flatMap((p) => p.workstreams.map((w) => [w.id, w.pct]))),
      completedCount: stats.completed,
    });
  }, [lastVisitLoaded, loading, error, pillars, stats]);

  const today = dateKey(new Date());
  const todayEnergy = energyLog.find((e) => e.date === today)?.level;
  const logEnergy = (level: EnergyLevel) => {
    const next = [...energyLog.filter((e) => e.date !== today), { date: today, level }].sort((a, b) =>
      a.date < b.date ? -1 : 1
    );
    setEnergyLog(next);
    saveEnergyLog(next);
  };
  const lowStreak = todayEnergy === 'low' ? lowStreakEndingToday(energyLog) : 0;
  // Two-plus low days running keeps only the single most pressing item;
  // one low day trims to a short list. Otherwise, show everything as usual.
  const energyCap = lowStreak >= 2 ? 1 : lowStreak === 1 ? 3 : Infinity;
  // A day already carrying 6+ hours of calendar commitments (lectures, a work
  // shift) gets the same single-item treatment as a low-energy day; 3+ hours
  // trims to a short list — real calendar load, not a guess.
  const calendarCap = todayCalMinutes === null ? Infinity : todayCalMinutes >= 360 ? 1 : todayCalMinutes >= 180 ? 3 : Infinity;
  const taskCap = Math.min(energyCap, calendarCap);
  const limitedByCalendar = calendarCap < Infinity && calendarCap <= energyCap;

  const activePillars = pillars.filter((p) => p.primary || p.active);
  // ws.next already reads "All caught up here" when the workstream has no
  // open/actionable task — reuse that instead of recomputing it, so a
  // picker option can warn before you pick a dead end.
  const priorityOptions = activePillars.flatMap((p) =>
    p.workstreams.map((w) => ({
      id: w.id,
      label: `${p.name} · ${w.name}${w.next === 'All caught up here' ? ' — no open tasks' : ''}`,
    }))
  );
  const handlePriorityChange = async (workstreamId: string) => {
    if (!workstreamId) return;
    setPriorityChanging(true);
    setPriorityError(null);
    try {
      const res = await fetch('/api/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workstreamId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update priority');
      refresh();
    } catch (err) {
      setPriorityError(err instanceof Error ? err.message : 'Failed to update priority');
    } finally {
      setPriorityChanging(false);
    }
  };

  // Backs the inline "Add a task" box that shows up when the priority
  // workstream has caught up — the First Move message says you can add one
  // right there, so there has to actually be a place to do it.
  const handleAddTask = async () => {
    if (!newTaskText.trim() || !priorityWorkstreamId) return;
    setAddingTask(true);
    setAddTaskError(null);
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workstreamId: priorityWorkstreamId, text: newTaskText.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to add task');
      setNewTaskText('');
      refresh();
    } catch (err) {
      setAddTaskError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setAddingTask(false);
    }
  };

  // Rest of today is the real day queue — tasks actually assigned a Planned
  // Date of today at the Board Meeting's daily planner — not the entire
  // open backlog across every workstream. Nothing planned for today reads
  // the same whether that's because everything's done or nothing was ever
  // queued; both are honestly "nothing queued."
  // A priority being set (not just firstMove being non-null) is what "the
  // board has run" actually means — a priority workstream with zero open
  // tasks right now still counts as having been set.
  const boardHasRun = !!priorityWorkstreamId;
  const rest = todayPlan.filter((t) => t.id !== firstMove?.id);
  const visibleRest = Number.isFinite(taskCap) ? rest.slice(0, taskCap) : rest;
  const hiddenCount = rest.length - visibleRest.length;
  const allDone = !loading && boardHasRun && openTasks.length === 0;

  type MovementNote = { text: string; delta: number };
  const movementNotes: MovementNote[] = [];
  if (lastVisit) {
    for (const p of pillars) {
      for (const w of p.workstreams) {
        const prevPct = lastVisit.workstreamPct[w.id];
        if (typeof prevPct === 'number' && w.pct > prevPct) {
          movementNotes.push({ text: `${w.name} moved to ${w.pct}% — up from ${prevPct}%.`, delta: w.pct - prevPct });
        }
      }
    }
    if (stats.completed > lastVisit.completedCount) {
      const diff = stats.completed - lastVisit.completedCount;
      movementNotes.push({
        text: `${diff} more task${diff === 1 ? '' : 's'} completed since your last visit.`,
        delta: diff * 5,
      });
    }
  }
  movementNotes.sort((a, b) => b.delta - a.delta);
  const topMovementNotes = movementNotes.slice(0, 3);

  // The signature moment: whatever's most genuinely urgent right now, always
  // in the same spot, always real — openTasks is already sorted overdue-first
  // then soonest-deadline, so its head is exactly that.
  const spotlightTask = openTasks[0] || null;
  const spotlightState: 'overdue' | 'today' | 'upcoming' | 'open' | 'clear' = !spotlightTask
    ? 'clear'
    : spotlightTask.overdue
    ? 'overdue'
    : spotlightTask.deadlineLabel === 'Due today'
    ? 'today'
    : spotlightTask.deadline
    ? 'upcoming'
    : 'open';
  const spotlightCopy: Record<typeof spotlightState, { eyebrow: string; bg: string }> = {
    overdue: { eyebrow: 'Overdue', bg: '#A24E2E' },
    today: { eyebrow: 'Due today', bg: '#A33757' },
    upcoming: { eyebrow: 'Next up', bg: '#8A4F79' },
    open: { eyebrow: 'On deck', bg: '#8F5A12' },
    clear: { eyebrow: 'All clear', bg: '#4A5A3C' },
  };
  const spotlightStampText =
    spotlightState === 'today'
      ? 'Today'
      : spotlightState === 'open' || spotlightState === 'clear'
      ? '—'
      : spotlightTask?.deadline
      ? new Date(spotlightTask.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : '—';

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '40px 44px 140px 44px' }} className="fcc-fade-up">
      {/* The Brief */}
      <section
        style={{
          position: 'relative',
          background: 'linear-gradient(160deg, #5E2246 0%, #4C1D3D 70%)',
          color: '#F1E9DE',
          borderRadius: 18,
          padding: '34px 38px 30px 38px',
          boxShadow: '0 2px 4px rgba(43, 33, 24, 0.08), 0 18px 44px rgba(43, 33, 24, 0.18)',
        }}
      >
        <button
          onClick={() => spotlightTask && setSelectedTask(spotlightTask)}
          title={spotlightTask ? `${spotlightTask.label} — click for details` : 'Nothing urgent right now'}
          style={{
            position: 'absolute',
            top: -34,
            right: 6,
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: spotlightCopy[spotlightState].bg,
            border: '3px double rgba(244, 237, 227, 0.65)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            transform: 'rotate(-8deg)',
            boxShadow: '0 10px 22px rgba(43, 33, 24, 0.32)',
            cursor: spotlightTask ? 'pointer' : 'default',
            fontFamily: sans,
            padding: 0,
          }}
        >
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 248, 240, 0.85)', fontWeight: 700 }}>
            {spotlightCopy[spotlightState].eyebrow}
          </span>
          <span style={{ fontFamily: serif, fontSize: 16, color: '#FFF8F0', lineHeight: 1.15, textAlign: 'center', padding: '0 8px' }}>
            {spotlightStampText}
          </span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 34, letterSpacing: '0.005em' }}>
            {greetingText()}
          </h1>
          <div style={{ fontSize: 13, color: '#E3A8AC' }}>{todayLineText()}</div>
        </div>

        <p style={{ margin: '14px 0 0 0', maxWidth: 640, fontFamily: serif, fontSize: 18, fontWeight: 300, lineHeight: 1.55, color: '#DFD3C6' }}>
          You&rsquo;re in <em style={{ color: '#FFBB94', fontStyle: 'italic' }}>Foundation &amp; Validation</em>. One priority this
          season: <strong style={{ fontWeight: 500, color: '#F1E9DE' }}>validate ForHer with real users before you build.</strong>{' '}
          Everything below is in service of that.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 26 }}>
          <div style={{ background: 'rgba(244, 237, 227, 0.06)', border: '1px solid rgba(244, 237, 227, 0.1)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CE8AA0', marginBottom: 10 }}>
              Since you were last here
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, lineHeight: 1.5, color: '#E6DCD0' }}>
              {topMovementNotes.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#9DB08F' }}>▲</span>
                  <span>{n.text}</span>
                </div>
              ))}
              {topMovementNotes.length === 0 && (
                <div>
                  {lastVisit ? 'Nothing’s moved since your last visit — check back soon.' : 'Welcome — this fills in after your next visit.'}
                </div>
              )}
            </div>
          </div>
          <div style={{ background: 'rgba(191, 138, 61, 0.1)', border: '1px solid rgba(191, 138, 61, 0.28)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D0A461', marginBottom: 10 }}>
              Needs your attention
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, lineHeight: 1.5, color: '#EDDFC9' }}>
              {openTasks
                .filter((t) => t.deadlineLabel)
                .slice(0, 3)
                .map((t) => (
                  <div key={t.id} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#D0A461' }}>●</span>
                    <span>
                      <strong style={{ fontWeight: 600 }}>{t.label}</strong> — {t.deadlineLabel}. It&rsquo;s a deadline — it stays
                      at the top until it&rsquo;s done.
                    </span>
                  </div>
                ))}
              {openTasks.filter((t) => t.deadlineLabel).length === 0 && !loading && (
                <div>Nothing flagged right now.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div style={{ marginTop: 14, background: '#FBE4DE', border: '1px solid #F5C6C1', color: '#852E4E', borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
          Couldn&rsquo;t reach Airtable: {error}
        </div>
      )}

      {/* Today + Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 26, marginTop: 30, alignItems: 'start' }}>
        {/* TODAY */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 30 }}>
          <h2 style={{ margin: '0 0 2px 4px', fontFamily: serif, fontWeight: 500, fontSize: 21, color: '#2B2118' }}>Today</h2>

          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A' }}>
                Energy check
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => logEnergy(level)}
                    style={{
                      border: `1px solid ${todayEnergy === level ? '#A33757' : '#DDD2C1'}`,
                      background: todayEnergy === level ? '#FBE4DE' : 'transparent',
                      color: todayEnergy === level ? '#A33757' : '#7A6E60',
                      fontFamily: sans,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '5px 12px',
                      borderRadius: 99,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            {lowStreak >= 2 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#A24E2E', lineHeight: 1.5 }}>
                {`Energy’s been low ${lowStreak} days running — keeping today’s list light.`}
              </div>
            )}
            {lowStreak === 1 && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#A79A8A', lineHeight: 1.5 }}>
                Low energy today — showing fewer suggestions.
              </div>
            )}
            {limitedByCalendar && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#A79A8A', lineHeight: 1.5 }}>
                {`Today’s calendar already has ${Math.round(((todayCalMinutes || 0) / 60) * 10) / 10}h booked — keeping suggestions light.`}
              </div>
            )}
          </div>

          {allDone && (
            <div style={{ background: '#EEF0E6', border: '1px solid #CBD3B8', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
              <div style={{ fontFamily: serif, fontSize: 17, color: '#4A5A3C' }}>That&rsquo;s everything for today.</div>
              <div style={{ marginTop: 4, fontSize: 13, color: '#6C7A5C', lineHeight: 1.5 }}>
                The whole list, done. Take the evening — the work will be here tomorrow.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '18px 20px', fontSize: 13.5, color: '#A79A8A' }}>
              Loading your tasks…
            </div>
          )}

          {firstMove ? (
            <button
              onClick={() => setSelectedTask(firstMove)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(150deg, #A33757, #852E4E)',
                color: '#FFF3EC',
                borderRadius: 14,
                padding: '20px 22px',
                boxShadow: '0 2px 4px rgba(87, 38, 63, 0.2), 0 14px 32px rgba(87, 38, 63, 0.28)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F9CBBE' }}>First move</div>
              <div style={{ marginTop: 10, fontFamily: serif, fontSize: 18.5, lineHeight: 1.4, fontWeight: 400 }}>
                {firstMove.label}
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: '#F6BBAF' }}>
                {`Top priority for ${firstMove.workstreamName || 'this week'} · set at Sunday’s Board Meeting.`}
              </div>
            </button>
          ) : priorityWorkstreamId ? (
            <div style={{ background: '#F1EBE0', border: '1px solid #DDD2C1', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79A8A' }}>First move</div>
              <div style={{ marginTop: 10, fontFamily: serif, fontSize: 16.5, lineHeight: 1.4, fontWeight: 400, color: '#7A6E60' }}>
                {priorityWorkstreamName} is your priority, but it has no open tasks right now.
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: '#A79A8A', lineHeight: 1.5 }}>
                Add a task to it, or change priority in the panel below.
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                <input
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  placeholder={`Add a task to ${priorityWorkstreamName}…`}
                  disabled={addingTask}
                  style={{ flex: 1, fontFamily: sans, fontSize: 13, color: '#3A2F24', background: '#FFFDF8', border: '1px solid #DDD2C1', borderRadius: 9, padding: '8px 12px' }}
                />
                <button
                  onClick={handleAddTask}
                  disabled={addingTask || !newTaskText.trim()}
                  style={{ border: 'none', cursor: addingTask || !newTaskText.trim() ? 'default' : 'pointer', background: '#A33757', color: '#FFF3EC', fontFamily: sans, fontSize: 12.5, fontWeight: 600, padding: '8px 16px', borderRadius: 9, opacity: addingTask || !newTaskText.trim() ? 0.6 : 1 }}
                >
                  {addingTask ? 'Adding…' : 'Add'}
                </button>
              </div>
              {addTaskError && <div style={{ marginTop: 6, fontSize: 12, color: '#A24E2E' }}>{addTaskError}</div>}
            </div>
          ) : (
            <div style={{ background: '#F1EBE0', border: '1px solid #DDD2C1', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79A8A' }}>First move</div>
              <div style={{ marginTop: 10, fontFamily: serif, fontSize: 16.5, lineHeight: 1.4, fontWeight: 400, color: '#7A6E60' }}>
                No priority set yet — runs at Sunday&rsquo;s Board Meeting, or pick one below.
              </div>
            </div>
          )}

          {/* Change priority — writes Priority Order directly, no Board Meeting needed */}
          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 8 }}>
              Change priority
            </div>
            <select
              value=""
              onChange={(e) => handlePriorityChange(e.target.value)}
              disabled={priorityChanging || priorityOptions.length === 0}
              style={{ width: '100%', fontFamily: sans, fontSize: 13.5, color: '#3A2F24', background: '#FFFDF8', border: '1px solid #DDD2C1', borderRadius: 10, padding: '10px 13px' }}
            >
              <option value="">{priorityChanging ? 'Updating…' : 'Set a new priority…'}</option>
              {priorityOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            {priorityError && <div style={{ marginTop: 6, fontSize: 12, color: '#A24E2E' }}>{priorityError}</div>}
            <p style={{ margin: '8px 0 0 0', fontSize: 11.5, color: '#A79A8A', lineHeight: 1.4 }}>
              Writes Priority Order in Airtable immediately — First move above updates right after.
            </p>
          </div>

          {/* This week's priorities — the ranked list behind First Move, not
              just its head. One strict #1 still wins First Move; this is
              what's lined up behind it. */}
          {priorities.length > 0 && (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '14px 18px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 8 }}>
                This week&rsquo;s priorities
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {priorities.map((p, i) => (
                  <div
                    key={p.workstreamId}
                    onClick={() => p.task && setSelectedTask(p.task)}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '8px 4px',
                      borderTop: i === 0 ? 'none' : '1px solid #F3EDE1',
                      cursor: p.task ? 'pointer' : 'default',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#A79A8A', width: 14, flexShrink: 0, paddingTop: 1 }}>
                      {i + 1}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#A79A8A' }}>{p.workstreamName}</div>
                      <div style={{ fontSize: 13, color: p.task ? '#3A2F24' : '#A79A8A', lineHeight: 1.4 }}>
                        {p.task ? p.task.label : 'No open tasks'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rest of today */}
          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 8px 22px rgba(43, 33, 24, 0.07)', overflow: 'hidden' }}>
            <button
              onClick={() => setRestOpen((o) => !o)}
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '15px 20px',
                fontFamily: sans,
                fontSize: 13.5,
                fontWeight: 500,
                color: '#5C5145',
              }}
            >
              <span>
                Rest of today · {rest.length === 0 ? 'nothing queued' : `${rest.length} item${rest.length === 1 ? '' : 's'}`}
              </span>
              <span style={{ color: '#A79A8A', fontSize: 11 }}>{restOpen ? '▲' : '▼'}</span>
            </button>
            {restOpen && (
              <div style={{ borderTop: '1px solid #F0E9DD', padding: '6px 8px 10px 8px', display: 'flex', flexDirection: 'column' }}>
                {visibleRest.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 9, cursor: 'pointer' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTask(task.id);
                      }}
                      style={{
                        width: 19,
                        height: 19,
                        flexShrink: 0,
                        marginTop: 1,
                        borderRadius: 6,
                        cursor: 'pointer',
                        border: '1.5px solid #C4B7A5',
                        background: 'transparent',
                        color: '#FFFDF8',
                        fontSize: 11,
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#3A2F24' }}>{task.label}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#A79A8A' }}>
                          {task.pillarName}
                          {task.workstreamName ? ` · ${task.workstreamName}` : ''}
                        </span>
                        {task.deadlineLabel && <span style={badgeStyle}>{task.deadlineLabel}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {rest.length === 0 && (
                  <div style={{ padding: '10px 12px', fontSize: 13, color: '#A79A8A' }}>
                    Nothing queued for today — assign tasks to specific days at the Board Meeting.
                  </div>
                )}
                {hiddenCount > 0 && (
                  <div style={{ padding: '8px 12px 4px 12px', fontSize: 12, color: '#A79A8A', fontStyle: 'italic' }}>
                    {limitedByCalendar
                      ? `${hiddenCount} more hidden — today’s calendar is packed, keeping the list light.`
                      : `${hiddenCount} more hidden — energy’s low, keeping today light.`}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* PILLARS */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
            <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 21, color: '#2B2118' }}>Pillars</h2>
            <div style={{ fontSize: 12, color: '#A79A8A' }}>
              {activePillars.length} active · dormant pillars stay hidden until you wake them
            </div>
          </div>

          {activePillars.map((pillar) => {
            const isExpanded = !!expanded[pillar.id];
            const visible = isExpanded ? pillar.workstreams : pillar.workstreams.slice(0, 3);
            const hiddenCount = pillar.workstreams.length - 3;
            return (
              <div
                key={pillar.id}
                style={{
                  background: '#FFFDF8',
                  border: '1px solid #EAE2D6',
                  borderRadius: 16,
                  padding: '22px 24px 16px 24px',
                  boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 10px 26px rgba(43, 33, 24, 0.07)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pillar.color }} />
                      <span style={{ fontFamily: serif, fontSize: 19, fontWeight: 500, color: '#2B2118' }}>{pillar.name}</span>
                      {pillar.primary && (
                        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A33757', background: '#FBE4DE', padding: '3px 9px', borderRadius: 99, fontWeight: 600 }}>
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#5C5145', flexShrink: 0 }}>{pillar.pct}%</div>
                </div>
                <div style={{ marginTop: 12, height: 5, borderRadius: 99, background: '#EFE8DB', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: pillar.color, width: `${pillar.pct}%` }} />
                </div>

                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
                  {visible.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => setSelectedWorkstream({ workstream: ws, pillarName: pillar.name, pillarColor: pillar.color })}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(150px, 200px) 76px 1fr',
                        gap: 14,
                        alignItems: 'center',
                        padding: '11px 4px',
                        width: '100%',
                        border: 'none',
                        borderTop: '1px solid #F3EDE1',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: '#3A2F24', lineHeight: 1.35 }}>{ws.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#EFE8DB', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: pillar.colorSoft, width: `${ws.pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#A79A8A', width: 28 }}>{ws.pct}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, justifyContent: 'flex-end', textAlign: 'right' }}>
                        <span style={{ fontSize: 12.5, color: '#7A6E60', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.next}
                        </span>
                        {ws.deadlineLabel && <span style={badgeStyle}>{ws.deadlineLabel}</span>}
                      </div>
                    </button>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [pillar.id]: !e[pillar.id] }))}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        padding: '10px 4px 6px 4px',
                        borderTop: '1px solid #F3EDE1',
                        fontFamily: sans,
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: '#A33757',
                      }}
                    >
                      {isExpanded ? 'Show less' : `Show ${hiddenCount} more workstreams`}
                    </button>
                  )}
                  {pillar.workstreams.length === 0 && (
                    <div style={{ padding: '11px 4px', fontSize: 12.5, color: '#A79A8A' }}>No workstreams yet.</div>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && activePillars.length === 0 && (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 16, padding: '22px 24px', fontSize: 13.5, color: '#A79A8A' }}>
              No active pillars yet — add one in Airtable or wake one up in Settings.
            </div>
          )}
        </section>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onToggleDone={onToggleTask} />
      )}
      {selectedWorkstream && (
        <WorkstreamDetailModal
          workstream={selectedWorkstream.workstream}
          pillarName={selectedWorkstream.pillarName}
          pillarColor={selectedWorkstream.pillarColor}
          onClose={() => setSelectedWorkstream(null)}
          onSelectTask={(t) => {
            setSelectedWorkstream(null);
            setSelectedTask(t);
          }}
          onToggleDone={onToggleTask}
        />
      )}
    </div>
  );
}
