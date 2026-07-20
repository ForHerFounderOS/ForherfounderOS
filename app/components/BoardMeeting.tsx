'use client';

import { useEffect, useRef, useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar, ViewTask } from '@/lib/model';
import type { ViewCalDay } from '@/lib/calendarView';
import { dayCapacityMinutes } from '@/lib/calendarView';

export type Decision = { id: number; text: string; recorded?: boolean };
export type MeetingSnapshot = { workstreamPct: Record<string, number>; completedCount: number };
// A single task queued for a specific day. taskId set = an existing open
// task getting a Planned Date; taskId null = a new task, created and
// planned in one step on approval.
export type DayPlanItem = { id: number; date: string; text: string; workstreamId: string | null; taskId: string | null };
export type BoardState = {
  wins: string[];
  outcomes: string[];
  outcomesDone: boolean[];
  outcomeWorkstreamIds: (string | null)[];
  outcomeTaskIds: (string | null)[];
  priorityWorkstreamId: string;
  planRecovery: string;
  decisions: Decision[];
  dailyPlan: DayPlanItem[];
  lastFinishedDate: string | null;
  lastMeetingSnapshot: MeetingSnapshot | null;
};

export const DEFAULT_BOARD_STATE: BoardState = {
  wins: ['', '', ''],
  outcomes: ['', '', ''],
  outcomesDone: [false, false, false],
  outcomeWorkstreamIds: [null, null, null],
  outcomeTaskIds: [null, null, null],
  priorityWorkstreamId: '',
  planRecovery: '',
  decisions: [],
  dailyPlan: [],
  lastFinishedDate: null,
  lastMeetingSnapshot: null,
};

// This week's 7 dates (Monday-first), matching the order /api/calendar
// returns days in — so a day card can be paired with its real ISO date to
// write Planned Date against.
function thisWeekDates(): string[] {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

function hoursLabel(minutes: number): string {
  const h = Math.round((minutes / 60) * 2) / 2;
  return `${h}h`;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fieldBox: React.CSSProperties = {
  width: '100%',
  fontFamily: serif,
  fontSize: 16,
  color: '#2B2118',
  background: '#FFFDF8',
  border: '1px solid #EAE2D6',
  borderRadius: 11,
  padding: '13px 17px',
  boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
};

const darkSelect: React.CSSProperties = {
  width: '100%',
  fontFamily: sans,
  fontSize: 13,
  color: '#F1E9DE',
  background: 'rgba(244, 237, 227, 0.07)',
  border: '1px solid rgba(244, 237, 227, 0.18)',
  borderRadius: 10,
  padding: '9px 12px',
};

const smallBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#8F5A12',
  background: '#F6E8CF',
  border: '1px solid #E8D3A8',
  padding: '2px 7px',
  borderRadius: 99,
  flexShrink: 0,
};

function sectionHeader(num: string, title: string, subtitle: string) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: serif, fontSize: 15, color: '#D08A9B' }}>{num}</span>
        <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 22 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ margin: '6px 0 14px 30px', fontSize: 13, color: '#A79A8A' }}>{subtitle}</p>}
    </>
  );
}

export default function BoardMeeting({
  pillars,
  openTasks,
  stats,
  board,
  setBoard,
  onClose,
  refresh,
}: {
  pillars: ViewPillar[];
  openTasks: ViewTask[];
  stats: { total: number; completed: number; open: number; overdue: number };
  board: BoardState;
  setBoard: (b: BoardState) => void;
  onClose: () => void;
  refresh: () => void;
}) {
  const [decisionDraft, setDecisionDraft] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [calDays, setCalDays] = useState<ViewCalDay[] | null>(null);
  const [calError, setCalError] = useState(false);
  const [dayDrafts, setDayDrafts] = useState<Record<string, { text: string; workstreamId: string }>>({});
  // A plain counter, not Date.now() — this gets called from inside a .map()
  // render callback (each day's "add task" handler), and the purity linter
  // flags Date.now()/Math.random() calls reachable from there even though
  // they only actually run on a later event, not during render itself.
  const dayPlanIdCounter = useRef(1);

  const activePillars = pillars.filter((p) => p.primary || p.active);
  const workstreamOptions = pillars.flatMap((p) => p.workstreams.map((w) => ({ id: w.id, label: `${p.name} · ${w.name}` })));
  const weekDates = thisWeekDates();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((json: { days?: ViewCalDay[]; error?: string }) => {
        if (cancelled) return;
        if (json.error || !json.days) setCalError(true);
        else setCalDays(json.days);
      })
      .catch(() => {
        if (!cancelled) setCalError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setWin = (i: number, val: string) => {
    const wins = [...board.wins];
    wins[i] = val;
    setBoard({ ...board, wins });
  };
  const setOutcome = (i: number, val: string) => {
    const outcomes = [...board.outcomes];
    outcomes[i] = val;
    setBoard({ ...board, outcomes });
  };
  const setOutcomeWorkstream = (i: number, id: string) => {
    const outcomeWorkstreamIds = [...board.outcomeWorkstreamIds];
    outcomeWorkstreamIds[i] = id || null;
    setBoard({ ...board, outcomeWorkstreamIds });
  };
  const toggleOutcome = (i: number) => {
    const outcomesDone = [...board.outcomesDone];
    outcomesDone[i] = !outcomesDone[i];
    setBoard({ ...board, outcomesDone });
  };
  const addDecision = () => {
    if (!decisionDraft.trim()) return;
    setBoard({ ...board, decisions: [...board.decisions, { id: Date.now(), text: decisionDraft.trim() }] });
    setDecisionDraft('');
  };
  const removeDecision = (id: number) => {
    setBoard({ ...board, decisions: board.decisions.filter((d) => d.id !== id) });
  };

  const addDayTask = (date: string, text: string, workstreamId: string | null, taskId: string | null) => {
    const id = dayPlanIdCounter.current++;
    setBoard({ ...board, dailyPlan: [...board.dailyPlan, { id, date, text, workstreamId, taskId }] });
  };
  const removeDayTask = (id: number) => {
    setBoard({ ...board, dailyPlan: board.dailyPlan.filter((d) => d.id !== id) });
  };
  const setDayDraft = (date: string, patch: Partial<{ text: string; workstreamId: string }>) => {
    const current = dayDrafts[date] || { text: '', workstreamId: '' };
    setDayDrafts({ ...dayDrafts, [date]: { ...current, ...patch } });
  };
  const commitDayDraft = (date: string) => {
    const draft = dayDrafts[date];
    if (!draft || !draft.text.trim() || !draft.workstreamId) return;
    addDayTask(date, draft.text.trim(), draft.workstreamId, null);
    setDayDrafts({ ...dayDrafts, [date]: { text: '', workstreamId: '' } });
  };
  const assignedTaskIds = new Set(board.dailyPlan.map((d) => d.taskId).filter((id): id is string => !!id));

  // Review Last Week: compares the current, real workstream percentages and
  // completed-task count against a snapshot taken the moment the previous
  // meeting was approved — evidence of what moved, not a feeling about it.
  type MovementNote = { text: string; delta: number };
  const movementNotes: MovementNote[] = [];
  if (board.lastMeetingSnapshot) {
    for (const p of pillars) {
      for (const w of p.workstreams) {
        const prevPct = board.lastMeetingSnapshot.workstreamPct[w.id];
        if (typeof prevPct === 'number' && w.pct !== prevPct) {
          movementNotes.push({ text: `${w.name} ${w.pct > prevPct ? 'moved' : 'slipped'} from ${prevPct}% to ${w.pct}%.`, delta: Math.abs(w.pct - prevPct) });
        }
      }
    }
  }
  movementNotes.sort((a, b) => b.delta - a.delta);
  const completedSinceLast = board.lastMeetingSnapshot ? Math.max(0, stats.completed - board.lastMeetingSnapshot.completedCount) : null;

  // Capacity Check & daily plan: real ICS-derived load for each day of the
  // coming week, same durationMinutes data Home uses to trim "Rest of
  // today" — paired with a real capacity budget per day (see
  // dayCapacityMinutes) so tasks get assigned against actual room, not a
  // flat weekly total.
  const dayLoads = (calDays || []).map((d, i) => {
    const minutes = d.events.reduce((sum, e) => (e.allDay ? sum : sum + (e.durationMinutes || 0)), 0);
    const protectedMinutes = d.events.filter((e) => e.protected).reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    return {
      date: weekDates[i],
      name: d.name,
      dateNum: d.dateNum,
      isToday: d.isToday,
      minutes,
      protectedMinutes,
      capacityMinutes: dayCapacityMinutes(minutes),
    };
  });
  const totalBookedHours = Math.round((dayLoads.reduce((sum, d) => sum + d.minutes, 0) / 60) * 10) / 10;
  const totalProtectedHours = Math.round((dayLoads.reduce((sum, d) => sum + d.protectedMinutes, 0) / 60) * 10) / 10;
  const busiestDays = [...dayLoads].filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes).slice(0, 2);
  const unassignedOpenTasks = openTasks.filter((t) => !assignedTaskIds.has(t.id));

  // Close: a real recap of what approval is about to write, so nothing
  // lands in Airtable that wasn't reviewed first.
  const winsEntered = board.wins.filter((w) => w.trim());
  const decisionsToLog = board.decisions.filter((d) => !d.recorded && d.text.trim());
  const outcomesToCreate = board.outcomes
    .map((text, i) => ({ text, workstreamId: board.outcomeWorkstreamIds[i], done: board.outcomesDone[i], taskId: board.outcomeTaskIds[i] }))
    .filter((o) => o.text.trim() && o.workstreamId && !o.taskId);
  const outcomesAlreadyDone = outcomesToCreate.filter((o) => o.done).length;
  const priorityWorkstream = workstreamOptions.find((w) => w.id === board.priorityWorkstreamId) || null;
  const priorityNextTask = board.priorityWorkstreamId
    ? pillars.flatMap((p) => p.workstreams).find((w) => w.id === board.priorityWorkstreamId)?.next || null
    : null;
  const dailyPlanDaysUsed = new Set(board.dailyPlan.map((d) => d.date)).size;

  const handleFinish = async () => {
    setFinishing(true);
    setFinishError(null);
    const isNewDay = board.lastFinishedDate !== todayKey();
    try {
      const res = await fetch('/api/board-meeting/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcomes: board.outcomes.map((text, i) => ({
            text,
            done: !!board.outcomesDone[i],
            workstreamId: board.outcomeWorkstreamIds[i] || null,
            taskId: board.outcomeTaskIds[i] || null,
          })),
          decisions: board.decisions.map((d) => ({ id: d.id, text: d.text, recorded: !!d.recorded })),
          dailyPlan: board.dailyPlan.map((d) => ({ date: d.date, text: d.text, workstreamId: d.workstreamId, taskId: d.taskId })),
          priorityWorkstreamId: board.priorityWorkstreamId || null,
          wins: board.wins,
          planRecovery: board.planRecovery,
          isNewDay,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to close the meeting');

      const outcomeTaskIds: (string | null)[] = json.outcomeTaskIds || board.outcomeTaskIds;
      const decisionsRecorded: number[] = json.decisionsRecorded || [];
      const decisions = board.decisions.map((d) => (decisionsRecorded.includes(d.id) ? { ...d, recorded: true } : d));
      const dailyPlanTaskIds: (string | null)[] = json.dailyPlanTaskIds || board.dailyPlan.map((d) => d.taskId);
      const dailyPlan = board.dailyPlan.map((d, i) => ({ ...d, taskId: dailyPlanTaskIds[i] || d.taskId }));

      const nextBoard: BoardState = {
        ...board,
        outcomeTaskIds,
        decisions,
        dailyPlan,
        lastFinishedDate: json.weeklyReviewCreated ? todayKey() : board.lastFinishedDate,
        lastMeetingSnapshot: {
          workstreamPct: Object.fromEntries(pillars.flatMap((p) => p.workstreams.map((w) => [w.id, w.pct]))),
          completedCount: stats.completed,
        },
      };
      setBoard(nextBoard);

      const errors: string[] = json.errors || [];
      if (errors.length > 0) {
        setFinishError(`Closed with some updates skipped: ${errors.join(' · ')}`);
        return;
      }

      refresh();
      onClose();
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : 'Failed to close the meeting');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '46px 44px 160px 44px' }} className="fcc-fade-up">
      <div style={{ textAlign: 'center', paddingBottom: 30, borderBottom: '1px solid #E4DACB' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A33757', fontWeight: 600 }}>
          The Sunday ritual
        </div>
        <h1 style={{ margin: '10px 0 0 0', fontFamily: serif, fontWeight: 400, fontSize: 36 }}>Weekly Board Meeting</h1>
        <p style={{ margin: '12px auto 0 auto', maxWidth: 460, fontSize: 14, color: '#7A6E60', lineHeight: 1.55 }}>
          Forty-five minutes with your only board member: you. Everything you write here is kept.
        </p>
        <a
          href="https://www.promptlatte.com"
          target="_blank"
          rel="noopener"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 14,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#A33757',
            background: '#FBE4DE',
            border: '1px solid #F5C6C1',
            padding: '6px 14px',
            borderRadius: 99,
            textDecoration: 'none',
          }}
        >
          ☕ PromptLatte
        </a>
      </div>

      {/* 01 Wins */}
      <section style={{ marginTop: 36 }}>
        {sectionHeader('01', 'Wins first', 'Before anything else. Small counts.')}
        <div style={{ marginLeft: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {board.wins.map((val, i) => (
            <input
              key={i}
              value={val}
              onChange={(e) => setWin(i, e.target.value)}
              placeholder={['One thing that went right…', 'Another…', 'Even a small one…'][i]}
              style={fieldBox}
            />
          ))}
        </div>
      </section>

      {/* 02 Review last week */}
      <section style={{ marginTop: 40 }}>
        {sectionHeader('02', 'Review last week', 'What actually moved since the last meeting. Evidence, not judgment.')}
        <div style={{ marginLeft: 30, background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
          {!board.lastMeetingSnapshot ? (
            <div style={{ fontSize: 13.5, color: '#A79A8A' }}>
              First Board Meeting on record — nothing to compare yet. Approving this one sets the baseline for next time.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, lineHeight: 1.5, color: '#3A2F24' }}>
              <div>
                <strong style={{ fontWeight: 600, color: '#4A5A3C' }}>
                  {completedSinceLast} task{completedSinceLast === 1 ? '' : 's'}
                </strong>{' '}
                completed since last time.
              </div>
              {movementNotes.length > 0 ? (
                movementNotes.map((n) => (
                  <div key={n.text} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#9DB08F' }}>▲</span>
                    <span>{n.text}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#A79A8A' }}>No workstream percentage changed since last time.</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 03 Company review */}
      <section style={{ marginTop: 40 }}>
        {sectionHeader('03', 'Company review', 'Active pillars only. Click one open to see its real open tasks.')}
        <div style={{ marginLeft: 30, background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '8px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
          {activePillars.map((row) => {
            const isExpanded = !!expandedPillars[row.id];
            const pillarTasks = openTasks.filter((t) => t.pillarName === row.name);
            return (
              <div key={row.id}>
                <button
                  onClick={() => setExpandedPillars((e) => ({ ...e, [row.id]: !e[row.id] }))}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px 1fr 18px',
                    gap: 16,
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '14px 0',
                    borderTop: '1px solid #F3EDE1',
                    alignItems: 'start',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#2B2118' }}>{row.name}</span>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5C5145' }}>
                    {row.pct}% overall · {row.workstreams.length} workstream{row.workstreams.length === 1 ? '' : 's'}
                    {row.workstreams.length ? ` · next: ${row.workstreams[0].next}` : ''}
                  </div>
                  <span style={{ color: '#A79A8A', fontSize: 11, textAlign: 'right', marginTop: 2 }}>{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 0 14px 17px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {pillarTasks.length === 0 && (
                      <div style={{ fontSize: 12.5, color: '#A79A8A' }}>No open tasks in this pillar.</div>
                    )}
                    {pillarTasks.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, fontSize: 12.5, color: '#5C5145' }}>
                        <span>
                          {t.overdue ? '⚠ ' : ''}
                          {t.label} <span style={{ color: '#A79A8A' }}>· {t.workstreamName}</span>
                        </span>
                        {t.deadlineLabel && <span style={smallBadge}>{t.deadlineLabel}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {activePillars.length === 0 && (
            <div style={{ padding: '14px 0', fontSize: 13.5, color: '#A79A8A' }}>No active pillars to review.</div>
          )}
        </div>
      </section>

      {/* 04 Decisions */}
      <section style={{ marginTop: 40 }}>
        {sectionHeader('04', 'Decisions', 'Decide once, write it down, stop re-deciding it. Review the list below — anything wrong can be removed before it’s logged to Knowledge.')}
        <div style={{ marginLeft: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {board.decisions.map((d) => (
            <div
              key={d.id}
              style={{
                background: '#FFFDF8',
                border: '1px solid #EAE2D6',
                borderRadius: 11,
                padding: '13px 17px',
                fontFamily: serif,
                fontSize: 16,
                color: '#2B2118',
                boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
                display: 'flex',
                gap: 12,
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ color: '#A33757', fontSize: 13 }}>✦</span>
                {d.text}
              </span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {d.recorded && (
                  <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4A5A3C', background: '#EEF0E6', padding: '3px 8px', borderRadius: 99 }}>
                    Logged
                  </span>
                )}
                <button
                  onClick={() => removeDecision(d.id)}
                  title="Remove this decision"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A79A8A', fontSize: 15, lineHeight: 1, padding: 2 }}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
          <input
            value={decisionDraft}
            onChange={(e) => setDecisionDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDecision()}
            placeholder="Record a decision, press Enter…"
            style={{ width: '100%', fontFamily: serif, fontSize: 16, color: '#2B2118', background: 'transparent', border: '1px dashed #CBBFAC', borderRadius: 11, padding: '13px 17px' }}
          />
        </div>
      </section>

      {/* 05 Plan the week */}
      <section style={{ marginTop: 40 }}>
        {sectionHeader('05', 'Plan the week', '')}
        <div
          style={{
            margin: '14px 0 0 30px',
            background: 'linear-gradient(160deg, #5E2246, #4C1D3D)',
            color: '#F1E9DE',
            borderRadius: 16,
            padding: '26px 28px',
            boxShadow: '0 2px 4px rgba(43, 33, 24, 0.08), 0 14px 36px rgba(43, 33, 24, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CE8AA0', marginBottom: 8 }}>
              The one priority
            </div>
            <select
              value={board.priorityWorkstreamId}
              onChange={(e) => setBoard({ ...board, priorityWorkstreamId: e.target.value })}
              style={{ width: '100%', fontFamily: serif, fontSize: 18, color: '#F1E9DE', background: 'rgba(244, 237, 227, 0.07)', border: '1px solid rgba(244, 237, 227, 0.18)', borderRadius: 11, padding: '13px 17px' }}
            >
              <option value="" style={{ color: '#2B2118' }}>
                If only one thing moves next week, it&rsquo;s…
              </option>
              {workstreamOptions.map((w) => (
                <option key={w.id} value={w.id} style={{ color: '#2B2118' }}>
                  {w.label}
                </option>
              ))}
            </select>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#CE8AA0' }}>
              Sets this workstream&rsquo;s Priority Order in Airtable — it becomes First Move on approval.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CE8AA0', marginBottom: 8 }}>
              Three outcomes, not thirty tasks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {board.outcomes.map((val, i) => {
                const done = !!board.outcomesDone[i];
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => toggleOutcome(i)}
                        title="Mark outcome complete"
                        style={{
                          width: 20,
                          height: 20,
                          flexShrink: 0,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          border: `1.5px solid ${done ? '#FB9590' : 'rgba(244, 237, 227, 0.35)'}`,
                          background: done ? '#FB9590' : 'transparent',
                          color: '#4C1D3D',
                          fontSize: 11,
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {done ? '✓' : ''}
                      </button>
                      <input
                        value={val}
                        onChange={(e) => setOutcome(i, e.target.value)}
                        placeholder={['Outcome one…', 'Outcome two…', 'Outcome three…'][i]}
                        style={{
                          flex: 1,
                          fontFamily: sans,
                          fontSize: 14,
                          color: '#F1E9DE',
                          background: 'rgba(244, 237, 227, 0.07)',
                          border: '1px solid rgba(244, 237, 227, 0.18)',
                          borderRadius: 10,
                          padding: '11px 15px',
                          textDecoration: done ? 'line-through' : 'none',
                          opacity: done ? 0.6 : 1,
                        }}
                      />
                    </div>
                    {val.trim() && (
                      <select
                        value={board.outcomeWorkstreamIds[i] || ''}
                        onChange={(e) => setOutcomeWorkstream(i, e.target.value)}
                        style={{ ...darkSelect, marginLeft: 28, width: 'calc(100% - 28px)' }}
                      >
                        <option value="" style={{ color: '#2B2118' }}>
                          Which workstream does this belong to?
                        </option>
                        {workstreamOptions.map((w) => (
                          <option key={w.id} value={w.id} style={{ color: '#2B2118' }}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#CE8AA0' }}>
              Each outcome becomes a real Task on approval — checked ones are created already done.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D0A461', marginBottom: 8 }}>
                Hard deadlines next week
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#EDDFC9' }}>
                {pillars
                  .flatMap((p) => p.workstreams)
                  .filter((w) => w.deadlineLabel)
                  .slice(0, 3)
                  .map((w) => `${w.deadlineLabel} · ${w.name}`)
                  .join(' · ') || 'None flagged right now.'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9DB08F', marginBottom: 8 }}>
                Recovery time, booked first
              </div>
              <input
                value={board.planRecovery}
                onChange={(e) => setBoard({ ...board, planRecovery: e.target.value })}
                placeholder="e.g. Wed + Sun evenings"
                style={{ width: '100%', fontFamily: sans, fontSize: 14, color: '#F1E9DE', background: 'rgba(157, 176, 143, 0.12)', border: '1px solid rgba(157, 176, 143, 0.35)', borderRadius: 10, padding: '11px 15px' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 06 Capacity check & daily plan */}
      <section style={{ marginTop: 40 }}>
        {sectionHeader(
          '06',
          'Capacity check & daily plan',
          'Real hours, real days — not three outcomes for the whole week and a guess at how they land.'
        )}
        <div style={{ marginLeft: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {calError ? (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 22px', fontSize: 13.5, color: '#A79A8A' }}>
              Couldn&rsquo;t reach the calendar feed — skipping the daily planner.
            </div>
          ) : calDays === null ? (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 22px', fontSize: 13.5, color: '#A79A8A' }}>
              Reading your week…
            </div>
          ) : (
            <>
              <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, lineHeight: 1.5, color: '#3A2F24' }}>
                  <div>
                    <strong style={{ fontWeight: 600, color: '#A33757' }}>{totalBookedHours}h</strong> already booked across the
                    coming week
                    {totalProtectedHours ? `, ${totalProtectedHours}h of that protected recovery time` : ''}.
                  </div>
                  {busiestDays.length > 0 && (
                    <div style={{ color: '#7A6E60' }}>
                      Heaviest: {busiestDays.map((d) => `${d.name} (${hoursLabel(d.minutes)})`).join(', ')}.
                    </div>
                  )}
                </div>
              </div>

              {dayLoads.map((day) => {
                const assigned = board.dailyPlan.filter((item) => item.date === day.date);
                const draft = dayDrafts[day.date] || { text: '', workstreamId: '' };
                const lightDay = assigned.length === 1 && day.capacityMinutes >= 180;
                return (
                  <div key={day.date} style={{ background: '#FFFDF8', border: `1px solid ${day.isToday ? '#D9C7B3' : '#EAE2D6'}`, borderRadius: 14, padding: '16px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: serif, fontSize: 15.5, color: '#2B2118' }}>
                        {day.name} {day.dateNum}
                        {day.isToday && <span style={{ marginLeft: 6, fontSize: 10.5, color: '#A33757', fontWeight: 600 }}>TODAY</span>}
                      </span>
                      <span style={smallBadge}>{hoursLabel(day.capacityMinutes)} available</span>
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {assigned.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, color: '#3A2F24', background: '#FBF7EE', borderRadius: 8, padding: '7px 11px' }}>
                          <span>{item.text}</span>
                          <button
                            onClick={() => removeDayTask(item.id)}
                            title="Remove"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A79A8A', fontSize: 13, lineHeight: 1, padding: 2, flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {assigned.length === 0 && <div style={{ fontSize: 12.5, color: '#A79A8A' }}>Nothing queued.</div>}
                      {lightDay && (
                        <div style={{ fontSize: 12, color: '#A24E2E' }}>
                          {`Just one task for a day with ${hoursLabel(day.capacityMinutes)} open — worth adding more.`}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <select
                        value=""
                        onChange={(e) => {
                          const task = unassignedOpenTasks.find((t) => t.id === e.target.value);
                          if (task) addDayTask(day.date, task.label, null, task.id);
                        }}
                        style={{ fontFamily: sans, fontSize: 12.5, color: '#5C5145', background: '#FFFDF8', border: '1px solid #DDD2C1', borderRadius: 8, padding: '7px 10px' }}
                      >
                        <option value="">Add an open task…</option>
                        {unassignedOpenTasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={draft.text}
                          onChange={(e) => setDayDraft(day.date, { text: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && commitDayDraft(day.date)}
                          placeholder="Or type a new task for this day…"
                          style={{ flex: 1, fontFamily: sans, fontSize: 12.5, color: '#3A2F24', background: '#FFFDF8', border: '1px dashed #CBBFAC', borderRadius: 8, padding: '7px 10px' }}
                        />
                      </div>
                      {draft.text.trim() && (
                        <select
                          value={draft.workstreamId}
                          onChange={(e) => setDayDraft(day.date, { workstreamId: e.target.value })}
                          style={{ fontFamily: sans, fontSize: 12.5, color: '#5C5145', background: '#FFFDF8', border: '1px solid #DDD2C1', borderRadius: 8, padding: '7px 10px' }}
                        >
                          <option value="">Which workstream?</option>
                          {workstreamOptions.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {draft.text.trim() && draft.workstreamId && (
                        <button
                          onClick={() => commitDayDraft(day.date)}
                          style={{ alignSelf: 'flex-start', border: 'none', cursor: 'pointer', background: '#F1EBE0', color: '#5C5145', fontFamily: sans, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8 }}
                        >
                          Add to {day.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* 07 Close */}
      <section style={{ marginTop: 40 }}>
        {sectionHeader('07', 'Close', 'Nothing above has been written anywhere yet — review it, then sign off.')}
        <div
          style={{
            marginLeft: 30,
            background: 'linear-gradient(160deg, #5E2246, #4C1D3D)',
            color: '#F1E9DE',
            borderRadius: 16,
            padding: '26px 28px',
            boxShadow: '0 2px 4px rgba(43, 33, 24, 0.08), 0 14px 36px rgba(43, 33, 24, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, lineHeight: 1.5 }}>
            <li style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: '#FB9590' }}>✦</span>
              {winsEntered.length > 0 ? `${winsEntered.length} win${winsEntered.length === 1 ? '' : 's'} recorded.` : 'No wins recorded.'}
            </li>
            <li style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: '#FB9590' }}>✦</span>
              {decisionsToLog.length > 0
                ? `${decisionsToLog.length} decision${decisionsToLog.length === 1 ? '' : 's'} will be logged to Knowledge.`
                : 'No new decisions to log.'}
            </li>
            <li style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: '#FB9590' }}>✦</span>
              {priorityWorkstream
                ? `Priority: ${priorityWorkstream.label}${priorityNextTask ? ` — First Move becomes "${priorityNextTask}".` : '.'}`
                : 'No priority chosen — First Move stays whatever it already was.'}
            </li>
            <li style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: '#FB9590' }}>✦</span>
              {outcomesToCreate.length > 0
                ? `${outcomesToCreate.length} outcome${outcomesToCreate.length === 1 ? '' : 's'} will become real tasks${outcomesAlreadyDone ? `, ${outcomesAlreadyDone} already marked done` : ''}.`
                : 'No new outcome tasks to create.'}
            </li>
            <li style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: '#FB9590' }}>✦</span>
              {board.dailyPlan.length > 0
                ? `${board.dailyPlan.length} task${board.dailyPlan.length === 1 ? '' : 's'} planned across ${dailyPlanDaysUsed} day${dailyPlanDaysUsed === 1 ? '' : 's'}.`
                : 'No daily plan set — nothing assigned to specific days this week.'}
            </li>
            <li style={{ display: 'flex', gap: 9 }}>
              <span style={{ color: '#FB9590' }}>✦</span>
              Recovery: {board.planRecovery.trim() || 'not set'}.
            </li>
          </ul>

          {finishError && (
            <div style={{ fontSize: 12.5, color: '#FFD9CE', background: 'rgba(178, 78, 46, 0.28)', border: '1px solid rgba(255, 217, 206, 0.35)', borderRadius: 9, padding: '10px 14px', lineHeight: 1.5 }}>
              {finishError}
            </div>
          )}

          <button
            onClick={handleFinish}
            disabled={finishing}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              cursor: finishing ? 'default' : 'pointer',
              opacity: finishing ? 0.7 : 1,
              background: '#FB9590',
              color: '#4C1D3D',
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 600,
              padding: '11px 22px',
              borderRadius: 9,
            }}
          >
            {finishing ? 'Approving…' : 'Approve & Close Meeting'}
          </button>
        </div>
      </section>
    </div>
  );
}
