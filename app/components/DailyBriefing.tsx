'use client';

import { useEffect, useState } from 'react';
import { serif } from '@/lib/theme';
import type { ViewTask } from '@/lib/model';
import { formatLongDate } from '@/lib/dateFormat';

type ViewCalEvent = { id: string; time: string; label: string; allDay: boolean };
type ViewCalDay = { name: string; dateNum: string; isToday: boolean; events: ViewCalEvent[] };

function todayLineText() {
  return formatLongDate(new Date());
}

export default function DailyBriefing({
  todayPlan,
  tasksLoading,
  tasksError,
}: {
  todayPlan: ViewTask[];
  tasksLoading: boolean;
  tasksError: string | null;
}) {
  const [todayEvents, setTodayEvents] = useState<ViewCalEvent[] | null>(null);
  const [calError, setCalError] = useState<string | null>(null);
  const [calLoading, setCalLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setCalError(json.error);
          return;
        }
        const today = (json.days as ViewCalDay[]).find((d) => d.isToday);
        setTodayEvents(today ? today.events : []);
      })
      .catch((err) => {
        if (!cancelled) setCalError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setCalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Everything below is scoped to todayPlan — tasks actually assigned a
  // Planned Date of today at the Board Meeting — not the whole open-task
  // backlog. A briefing that says "3 planned for today" and then only ever
  // shows 3 tasks can't contradict itself the way "18 open tasks" next to
  // an empty-looking list used to.
  const deadlineTasks = todayPlan.filter((t) => t.deadlineLabel);
  const otherTasks = todayPlan.filter((t) => !t.deadlineLabel);

  const loading = calLoading || tasksLoading;
  const error = calError || tasksError;
  const eventCount = (todayEvents || []).length;

  const summary = loading
    ? 'Reading today…'
    : `${eventCount} calendar event${eventCount === 1 ? '' : 's'} today · ${todayPlan.length} planned for today${
        deadlineTasks.length ? `, ${deadlineTasks.length} with a deadline` : ''
      }.`;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>{todayLineText()} — your briefing</h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: error ? '#A24E2E' : '#4A5A3C',
            background: error ? '#FBE9DC' : '#EEF0E6',
            padding: '4px 10px',
            borderRadius: 99,
          }}
        >
          {loading ? 'Loading…' : error ? 'Connection error' : 'Live · Calendar & Tasks'}
        </span>
      </div>
      <p
        style={{
          margin: '16px 0 0 0',
          fontFamily: serif,
          fontSize: 19,
          fontWeight: 300,
          lineHeight: 1.6,
          color: '#4A3F33',
          maxWidth: 620,
        }}
      >
        {summary}
      </p>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: '#FFFDF8',
            border: '1px solid #EAE2D6',
            borderRadius: 14,
            padding: '20px 24px',
            boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 8px 22px rgba(43, 33, 24, 0.07)',
          }}
        >
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 12 }}>
            Your day, in order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(todayEvents || []).map((ev) => (
              <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, fontSize: 14 }}>
                <span style={{ color: '#A79A8A' }}>{ev.time}</span>
                <span style={{ color: '#3A2F24' }}>{ev.label}</span>
              </div>
            ))}
            {!calLoading && !calError && (todayEvents || []).length === 0 && (
              <div style={{ fontSize: 13.5, color: '#A79A8A' }}>Nothing on the calendar today.</div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #E8D3A8',
              borderRadius: 14,
              padding: '20px 24px',
              boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
            }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B07A20', marginBottom: 10 }}>
              Today&rsquo;s deadlines
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, lineHeight: 1.5, color: '#3A2F24' }}>
              {deadlineTasks.map((t) => (
                <div key={t.id}>
                  <strong style={{ fontWeight: 600 }}>
                    {t.deadlineLabel} · {t.label}
                  </strong>
                  {t.pillarName ? ` — ${t.pillarName}` : ''}
                </div>
              ))}
              {!tasksLoading && deadlineTasks.length === 0 && <div style={{ color: '#A79A8A' }}>Nothing due today.</div>}
            </div>
          </div>
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #EAE2D6',
              borderRadius: 14,
              padding: '20px 24px',
              boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
            }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 10 }}>
              Also queued today
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, lineHeight: 1.5, color: '#3A2F24' }}>
              {otherTasks.map((t) => (
                <div key={t.id}>{t.label}</div>
              ))}
              {!tasksLoading && otherTasks.length === 0 && <div style={{ color: '#A79A8A' }}>Nothing else queued for today.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
