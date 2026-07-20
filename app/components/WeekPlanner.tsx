'use client';

import { useEffect, useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar, ViewTask } from '@/lib/model';
import type { ViewCalDay } from '@/lib/calendarView';
import { dayCapacityMinutes } from '@/lib/calendarView';
import TaskDetailModal from './TaskDetail';

// This week's 7 dates (Monday-first), matching the order /api/calendar
// returns days in — same convention the Board Meeting's daily planner uses,
// so a task planned here and one planned there land on the same real date.
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

const smallBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#7A6E60',
  background: '#F1EBE0',
  border: '1px solid #DDD2C1',
  padding: '2px 8px',
  borderRadius: 99,
  flexShrink: 0,
};

export default function WeekPlanner({
  pillars,
  openTasks,
  loading,
  error,
  onToggleTask,
  refresh,
}: {
  pillars: ViewPillar[];
  openTasks: ViewTask[];
  loading: boolean;
  error: string | null;
  onToggleTask: (id: string) => void;
  refresh: () => void;
}) {
  const [calDays, setCalDays] = useState<ViewCalDay[] | null>(null);
  const [calError, setCalError] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { text: string; workstreamId: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ViewTask | null>(null);

  const weekDates = thisWeekDates();
  const workstreamOptions = pillars.flatMap((p) => p.workstreams.map((w) => ({ id: w.id, label: `${p.name} · ${w.name}` })));

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

  const dayLoads = (calDays || []).map((d, i) => {
    const minutes = d.events.reduce((sum, e) => (e.allDay ? sum : sum + (e.durationMinutes || 0)), 0);
    return {
      date: weekDates[i],
      name: d.name,
      dateNum: d.dateNum,
      isToday: d.isToday,
      minutes,
      capacityMinutes: dayCapacityMinutes(minutes),
    };
  });

  const unplanned = openTasks.filter((t) => !t.plannedDate);

  const setDraft = (date: string, patch: Partial<{ text: string; workstreamId: string }>) => {
    const current = drafts[date] || { text: '', workstreamId: '' };
    setDrafts({ ...drafts, [date]: { ...current, ...patch } });
  };

  const assign = async (taskId: string, date: string) => {
    setBusyId(taskId);
    setActionError(null);
    try {
      const res = await fetch('/api/planner/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, date }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to plan task');
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to plan task');
    } finally {
      setBusyId(null);
    }
  };

  const unassign = async (taskId: string) => {
    setBusyId(taskId);
    setActionError(null);
    try {
      const res = await fetch('/api/planner/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to unplan task');
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to unplan task');
    } finally {
      setBusyId(null);
    }
  };

  const createForDay = async (date: string) => {
    const draft = drafts[date];
    if (!draft || !draft.text.trim() || !draft.workstreamId) return;
    setBusyId(`new-${date}`);
    setActionError(null);
    try {
      const res = await fetch('/api/planner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workstreamId: draft.workstreamId, text: draft.text.trim(), date }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create task');
      setDrafts({ ...drafts, [date]: { text: '', workstreamId: '' } });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setBusyId(null);
    }
  };

  const totalBookedHours = Math.round((dayLoads.reduce((sum, d) => sum + d.minutes, 0) / 60) * 10) / 10;
  const plannedThisWeek = openTasks.filter((t) => t.plannedDate && weekDates.includes(t.plannedDate)).length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '46px 44px 160px 44px' }} className="fcc-fade-up">
      <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Weekly Planner</h1>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 620, lineHeight: 1.55 }}>
        Assign tasks to specific days any time — not just at Sunday&rsquo;s Board Meeting. Spread a full week&rsquo;s
        worth across the days you actually have room, instead of relying on one outcome a day.
      </p>

      {error && (
        <div style={{ marginTop: 14, background: '#FBE4DE', border: '1px solid #F5C6C1', color: '#852E4E', borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
          Couldn&rsquo;t reach Airtable: {error}
        </div>
      )}
      {actionError && (
        <div style={{ marginTop: 14, background: '#FBE4DE', border: '1px solid #F5C6C1', color: '#852E4E', borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
          {actionError}
        </div>
      )}

      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
        {/* BACKLOG */}
        <section style={{ position: 'sticky', top: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
            <div style={{ fontSize: 13.5, color: '#3A2F24', lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 600, color: '#A33757' }}>{totalBookedHours}h</strong> already booked this
              week.
            </div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: '#7A6E60' }}>
              {plannedThisWeek} task{plannedThisWeek === 1 ? '' : 's'} planned so far · {unplanned.length} still
              unplanned.
            </div>
          </div>

          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 8px 18px', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A' }}>
              Unplanned backlog
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 520, overflowY: 'auto' }}>
              {unplanned.map((t) => (
                <div key={t.id} onClick={() => setSelectedTask(t)} style={{ padding: '10px 18px', borderTop: '1px solid #F3EDE1', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, color: '#3A2F24', lineHeight: 1.4 }}>{t.label}</div>
                  <div style={{ marginTop: 3, fontSize: 11, color: '#A79A8A' }}>
                    {t.pillarName}
                    {t.workstreamName ? ` · ${t.workstreamName}` : ''}
                  </div>
                </div>
              ))}
              {unplanned.length === 0 && !loading && (
                <div style={{ padding: '10px 18px 16px 18px', fontSize: 12.5, color: '#A79A8A' }}>
                  Nothing left in the backlog — everything open is already on a day.
                </div>
              )}
              {loading && <div style={{ padding: '10px 18px 16px 18px', fontSize: 12.5, color: '#A79A8A' }}>Loading…</div>}
            </div>
          </div>
        </section>

        {/* DAYS */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {calError ? (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 22px', fontSize: 13.5, color: '#A79A8A' }}>
              Couldn&rsquo;t reach the calendar feed — showing days without capacity.
            </div>
          ) : calDays === null ? (
            <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '16px 22px', fontSize: 13.5, color: '#A79A8A' }}>
              Reading your week…
            </div>
          ) : (
            dayLoads.map((day) => {
              const assigned = openTasks.filter((t) => t.plannedDate === day.date);
              const draft = drafts[day.date] || { text: '', workstreamId: '' };
              const lightDay = assigned.length <= 1 && day.capacityMinutes >= 180;
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
                    {assigned.map((t) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, color: '#3A2F24', background: '#FBF7EE', borderRadius: 8, padding: '7px 11px' }}>
                        <span onClick={() => setSelectedTask(t)} style={{ cursor: 'pointer' }}>
                          {t.label}
                        </span>
                        <button
                          onClick={() => unassign(t.id)}
                          disabled={busyId === t.id}
                          title="Move back to backlog"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A79A8A', fontSize: 13, lineHeight: 1, padding: 2, flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {assigned.length === 0 && <div style={{ fontSize: 12.5, color: '#A79A8A' }}>Nothing queued.</div>}
                    {lightDay && unplanned.length > 0 && (
                      <div style={{ fontSize: 12, color: '#A24E2E' }}>
                        {`${hoursLabel(day.capacityMinutes)} open here — worth adding more from the backlog.`}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <select
                      value=""
                      onChange={(e) => e.target.value && assign(e.target.value, day.date)}
                      disabled={unplanned.length === 0}
                      style={{ fontFamily: sans, fontSize: 12.5, color: '#5C5145', background: '#FFFDF8', border: '1px solid #DDD2C1', borderRadius: 8, padding: '7px 10px' }}
                    >
                      <option value="">Add an open task…</option>
                      {unplanned.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={draft.text}
                        onChange={(e) => setDraft(day.date, { text: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && createForDay(day.date)}
                        placeholder="Or type a new task for this day…"
                        style={{ flex: 1, fontFamily: sans, fontSize: 12.5, color: '#3A2F24', background: '#FFFDF8', border: '1px dashed #CBBFAC', borderRadius: 8, padding: '7px 10px' }}
                      />
                    </div>
                    {draft.text.trim() && (
                      <select
                        value={draft.workstreamId}
                        onChange={(e) => setDraft(day.date, { workstreamId: e.target.value })}
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
                        onClick={() => createForDay(day.date)}
                        disabled={busyId === `new-${day.date}`}
                        style={{ alignSelf: 'flex-start', border: 'none', cursor: 'pointer', background: '#F1EBE0', color: '#5C5145', fontFamily: sans, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8 }}
                      >
                        Add to {day.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onToggleDone={onToggleTask} />
      )}
    </div>
  );
}
