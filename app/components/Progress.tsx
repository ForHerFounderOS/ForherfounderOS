'use client';

import { serif } from '@/lib/theme';
import type { ViewPillar } from '@/lib/model';
import type { BoardState } from './BoardMeeting';

export default function Progress({
  pillars,
  stats,
  board,
}: {
  pillars: ViewPillar[];
  stats: { total: number; completed: number; open: number; overdue: number };
  board: BoardState;
}) {
  const activePillars = pillars.filter((p) => p.primary || p.active);
  const filledOutcomes = board.outcomes.map((o, i) => ({ label: o, done: !!board.outcomesDone[i] })).filter((o) => o.label.trim());
  const doneN = filledOutcomes.filter((o) => o.done).length;
  const weekPct = filledOutcomes.length ? Math.round((doneN / filledOutcomes.length) * 100) : 0;

  const statBlocks = [
    { num: stats.total, label: 'Total tasks', color: '#F1E9DE' },
    { num: stats.completed, label: 'Completed', color: '#F1E9DE' },
    { num: stats.open, label: 'Open', color: '#F1E9DE' },
    { num: stats.overdue, label: 'Overdue', color: '#E8B478' },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Progress</h1>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        Movement over the season — no streaks, no points. Just what has actually advanced.
      </p>

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, alignItems: 'stretch' }}>
        <div
          style={{
            background: 'linear-gradient(160deg, #5E2246, #4C1D3D)',
            color: '#F1E9DE',
            borderRadius: 16,
            padding: '26px 30px',
            boxShadow: '0 2px 4px rgba(43, 33, 24, 0.08), 0 14px 36px rgba(43, 33, 24, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CE8AA0' }}>Season</div>
              <div style={{ fontFamily: serif, fontSize: 22, marginTop: 4 }}>Foundation &amp; Validation</div>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(244, 237, 227, 0.12)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {statBlocks.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: serif, fontSize: 24, color: s.color }}>{s.num}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#CE8AA0', marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: '#FFFDF8',
            border: '1px solid #EAE2D6',
            borderRadius: 16,
            padding: '24px 26px',
            boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 10px 26px rgba(43, 33, 24, 0.07)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A33757' }}>This week</div>
          <div style={{ fontFamily: serif, fontSize: 22, marginTop: 6, color: '#2B2118' }}>
            {filledOutcomes.length ? `${doneN} of ${filledOutcomes.length} outcomes · ${weekPct}%` : 'No outcomes set yet'}
          </div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 99, background: '#F5E3D8', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${weekPct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #DC586D, #A33757)' }} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filledOutcomes.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'baseline', fontSize: 12.5, lineHeight: 1.45, color: o.done ? '#7A6E60' : '#3A2F24' }}>
                <span style={{ color: o.done ? '#A33757' : '#C4B7A5', flexShrink: 0 }}>{o.done ? '✓' : '○'}</span>
                <span style={{ textDecoration: o.done ? 'line-through' : 'none' }}>{o.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 12, fontSize: 11.5, color: '#A79A8A', lineHeight: 1.5 }}>
            Set at the Board Meeting. Tick them off there as the week moves.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          background: '#FFFDF8',
          border: '1px solid #EAE2D6',
          borderRadius: 16,
          padding: '22px 26px',
          boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 10px 26px rgba(43, 33, 24, 0.07)',
        }}
      >
        <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 6 }}>
          Pillar movement · live
        </div>
        {activePillars.map((row) => (
          <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 60px', gap: 16, alignItems: 'center', padding: '13px 0', borderTop: '1px solid #F3EDE1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#3A2F24' }}>{row.name}</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: '#EFE8DB', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: row.color, width: `${row.pct}%` }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: '#4A5A3C', fontWeight: 600 }}>{row.pct}%</div>
          </div>
        ))}
        {activePillars.length === 0 && (
          <div style={{ padding: '13px 0', fontSize: 13, color: '#A79A8A' }}>No active pillars yet.</div>
        )}
      </div>
    </div>
  );
}
