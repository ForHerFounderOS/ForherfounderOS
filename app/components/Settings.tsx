'use client';

import { useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar } from '@/lib/model';

type Conn = { calendar: boolean; cowork: boolean };

function loadConn(): Conn {
  try {
    const saved = JSON.parse(localStorage.getItem('fcc-connections') || 'null');
    if (saved) return saved;
  } catch {}
  return { calendar: false, cowork: false };
}

export default function Settings({
  pillars,
  loading,
  error,
  onTogglePillar,
}: {
  pillars: ViewPillar[];
  loading: boolean;
  error: string | null;
  onTogglePillar: (id: string, active: boolean) => void;
}) {
  const [conn, setConn] = useState<Conn>(loadConn);

  const toggleConn = (key: keyof Conn) => {
    setConn((c) => {
      const next = { ...c, [key]: !c[key] };
      try {
        localStorage.setItem('fcc-connections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const airtableOn = !error && !loading;

  const rows = [
    {
      id: 'airtable',
      name: 'Airtable',
      role: "Tasks, workstreams and pillar data — the system's source of truth.",
      on: airtableOn,
      status: loading ? 'Connecting…' : airtableOn ? 'Connected · live' : 'Connection error — check server credentials',
      locked: true,
    },
    {
      id: 'calendar',
      name: 'Calendar',
      role: 'Powers Calendar Intelligence and the shape of your day.',
      on: conn.calendar,
      status: conn.calendar ? 'Connected · example state' : 'Not connected',
      locked: false,
    },
    {
      id: 'cowork',
      name: 'Cowork / iMessage',
      role: 'Delivers the Daily Briefing to you each morning.',
      on: conn.cowork,
      status: conn.cowork ? 'Connected · example state' : 'Not connected',
      locked: false,
    },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '46px 44px 160px 44px' }} className="fcc-fade-up">
      <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Settings</h1>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        Connections and pillar control. Nothing else to configure — the system stays out of your way.
      </p>

      <section style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, padding: '0 4px 12px 4px' }}>
          <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 21 }}>Connections</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((c) => (
            <div
              key={c.id}
              style={{
                background: '#FFFDF8',
                border: '1px solid #EAE2D6',
                borderRadius: 14,
                padding: '18px 22px',
                boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 6px 18px rgba(43, 33, 24, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#2B2118' }}>{c.name}</div>
                <div style={{ marginTop: 3, fontSize: 13, color: '#7A6E60', lineHeight: 1.5 }}>{c.role}</div>
                <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.on ? '#7C9068' : '#D6CBB9', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: c.on ? '#4A5A3C' : '#A79A8A', fontWeight: 500 }}>{c.status}</span>
                </div>
              </div>
              {!c.locked && (
                <button
                  onClick={() => toggleConn(c.id as keyof Conn)}
                  style={{
                    flexShrink: 0,
                    cursor: 'pointer',
                    fontFamily: sans,
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: c.on ? 'transparent' : '#A33757',
                    color: c.on ? '#7A6E60' : '#FFF3EC',
                    border: `1px solid ${c.on ? '#DDD2C1' : '#A33757'}`,
                  }}
                >
                  {c.on ? 'Disconnect' : 'Connect'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 38 }}>
        <h2 style={{ margin: '0 0 6px 4px', fontFamily: serif, fontWeight: 500, fontSize: 21 }}>Pillars</h2>
        <p style={{ margin: '0 0 14px 4px', fontSize: 13, color: '#A79A8A', maxWidth: 520, lineHeight: 1.55 }}>
          Dormant pillars vanish from Home, Progress and the Board Meeting — no grey ghosts, no guilt. Wake one and it reports
          again. Toggling here writes straight to Airtable.
        </p>
        <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '4px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 6px 18px rgba(43, 33, 24, 0.06)' }}>
          {pillars.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 0', borderTop: '1px solid #F3EDE1' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2B2118' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#A79A8A', marginTop: 2 }}>
                  {p.primary
                    ? 'Primary — always on'
                    : p.active
                    ? 'Active — reporting everywhere'
                    : 'Dormant — hidden from Home, Progress and the Board Meeting'}
                </div>
              </div>
              <button
                onClick={p.primary ? undefined : () => onTogglePillar(p.id, !p.active)}
                disabled={p.primary}
                title={p.primary ? 'ForHer is locked as the primary pillar' : undefined}
                style={{
                  position: 'relative',
                  width: 42,
                  height: 24,
                  borderRadius: 99,
                  border: 'none',
                  cursor: p.primary ? 'default' : 'pointer',
                  background: p.primary || p.active ? p.color : '#DDD2C1',
                  opacity: p.primary ? 0.6 : 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: p.primary || p.active ? 21 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#FFFDF8',
                    boxShadow: '0 1px 3px rgba(43, 33, 24, 0.3)',
                    transition: 'left 0.15s ease',
                  }}
                />
              </button>
            </div>
          ))}
          {pillars.length === 0 && (
            <div style={{ padding: '15px 0', fontSize: 13, color: '#A79A8A' }}>No pillars in Airtable yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
