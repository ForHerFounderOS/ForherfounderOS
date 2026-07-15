'use client';

import { useEffect, useState } from 'react';
import { serif } from '@/lib/theme';

type ViewCalEvent = { id: string; time: string; label: string; allDay: boolean };
type ViewCalDay = { name: string; dateNum: string; isToday: boolean; events: ViewCalEvent[] };
type WeekSummary = { totalEvents: number; timedCount: number; allDayCount: number };

const PLACEHOLDER_DAYS: ViewCalDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((name) => ({
  name,
  dateNum: '',
  isToday: false,
  events: [],
}));

export default function CalendarIntelligence() {
  const [days, setDays] = useState<ViewCalDay[] | null>(null);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setError(json.error);
        else {
          setDays(json.days);
          setSummary(json.summary);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Calendar Intelligence</h1>
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
          {loading ? 'Loading…' : error ? 'Connection error' : 'Live · Google Calendar'}
        </span>
      </div>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        Not a calendar to manage — a read on the week you already have.
      </p>

      {error && (
        <div
          style={{
            marginTop: 20,
            background: '#FBE9DC',
            border: '1px solid #EAC4A8',
            borderRadius: 12,
            padding: '14px 18px',
            fontSize: 13.5,
            color: '#6E3018',
          }}
        >
          Couldn&rsquo;t reach Google Calendar: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginTop: 28, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {(days || PLACEHOLDER_DAYS).map((day) => (
            <div
              key={day.name}
              style={{
                background: day.isToday ? '#FFFDF8' : '#FCF9F2',
                border: `1px solid ${day.isToday ? '#D9C7B3' : '#EAE2D6'}`,
                borderRadius: 14,
                padding: '14px 12px',
                boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
                minHeight: 320,
              }}
            >
              <div style={{ textAlign: 'center', paddingBottom: 10, borderBottom: '1px solid #F0E9DD', marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: day.isToday ? '#A33757' : '#A79A8A',
                    fontWeight: 600,
                  }}
                >
                  {day.name}
                </div>
                <div style={{ fontFamily: serif, fontSize: 19, color: '#2B2118', marginTop: 2 }}>{day.dateNum}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {day.events.map((ev) => (
                  <div key={ev.id} style={{ background: '#FBE4DE', border: '1px solid #F5C6C1', borderRadius: 9, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#A33757', fontWeight: 600, letterSpacing: '0.03em' }}>{ev.time}</div>
                    <div style={{ fontSize: 12, color: '#852E4E', lineHeight: 1.35, marginTop: 2, fontWeight: 500 }}>{ev.label}</div>
                  </div>
                ))}
                {day.events.length === 0 && !loading && (
                  <div style={{ fontSize: 11.5, color: '#A79A8A', textAlign: 'center', paddingTop: 8 }}>Nothing scheduled</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', paddingLeft: 4 }}>
            This week at a glance
          </div>
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #EAE2D6',
              borderRadius: 14,
              padding: '18px 20px',
              boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
              fontSize: 13.5,
              lineHeight: 1.55,
              color: '#3A2F24',
            }}
          >
            {summary ? (
              <>
                <strong style={{ fontWeight: 600, color: '#A33757' }}>
                  {summary.totalEvents} event{summary.totalEvents === 1 ? '' : 's'}
                </strong>{' '}
                across Mon–Fri
                {summary.timedCount ? `, ${summary.timedCount} with a set time` : ''}
                {summary.allDayCount ? `, ${summary.allDayCount} all-day` : ''}.
              </>
            ) : loading ? (
              'Reading your week…'
            ) : (
              'No data yet.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
