'use client';

import { useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar, PeriodStats, PeriodTask } from '@/lib/model';
import type { BoardState } from './BoardMeeting';
import TaskDetailModal from './TaskDetail';

// The agreed scope of the ForHer roadmap — fixed at 24 workstreams regardless
// of how many happen to be in Airtable right now, so Overall tracks progress
// against the original commitment rather than whatever's currently listed.
const FORHER_ROADMAP_SIZE = 24;

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

type Tab = 'overall' | 'quarterly' | 'monthly' | 'weekly';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overall', label: 'Overall' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
];

function MeterCard({
  eyebrow,
  eyebrowColor,
  headline,
  pct,
  barFrom,
  barTo,
  barBg,
  footnote,
}: {
  eyebrow: string;
  eyebrowColor: string;
  headline: string;
  pct: number;
  barFrom: string;
  barTo: string;
  barBg: string;
  footnote: string;
}) {
  return (
    <div
      style={{
        background: '#FFFDF8',
        border: '1px solid #EAE2D6',
        borderRadius: 16,
        padding: '26px 28px',
        boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 10px 26px rgba(43, 33, 24, 0.07)',
      }}
    >
      <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: eyebrowColor }}>{eyebrow}</div>
      <div style={{ fontFamily: serif, fontSize: 26, marginTop: 8, color: '#2B2118' }}>{headline}</div>
      <div style={{ marginTop: 16, height: 8, borderRadius: 99, background: barBg, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${barFrom}, ${barTo})` }} />
      </div>
      <div style={{ marginTop: 12, fontSize: 12.5, color: '#A79A8A', lineHeight: 1.5 }}>{footnote}</div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 16, padding: '20px 26px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 10px 26px rgba(43, 33, 24, 0.07)' }}>
      <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function PeriodTaskList({
  items,
  emptyText,
  onSelect,
}: {
  items: PeriodTask[];
  emptyText: string;
  onSelect: (t: PeriodTask) => void;
}) {
  if (items.length === 0) {
    return <div style={{ padding: '13px 0', fontSize: 13, color: '#A79A8A' }}>{emptyText}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderTop: '1px solid #F3EDE1', cursor: 'pointer' }}
        >
          <span style={{ color: t.done ? '#A33757' : '#C4B7A5', fontSize: 13, flexShrink: 0 }}>{t.done ? '✓' : '○'}</span>
          <span
            style={{
              flex: 1,
              fontSize: 13.5,
              color: t.done ? '#A79A8A' : '#3A2F24',
              textDecoration: t.done ? 'line-through' : 'none',
            }}
          >
            {t.label}
          </span>
          {t.deadlineLabel && <span style={badgeStyle}>{t.deadlineLabel}</span>}
        </div>
      ))}
    </div>
  );
}

export default function Progress({
  pillars,
  stats,
  board,
  monthly,
  quarterly,
  onToggleTask,
}: {
  pillars: ViewPillar[];
  stats: { total: number; completed: number; open: number; overdue: number };
  board: BoardState;
  monthly: PeriodStats;
  quarterly: PeriodStats;
  onToggleTask: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('overall');
  const [selectedTask, setSelectedTask] = useState<PeriodTask | null>(null);

  const activePillars = pillars.filter((p) => p.primary || p.active);
  const filledOutcomes = board.outcomes.map((o, i) => ({ label: o, done: !!board.outcomesDone[i] })).filter((o) => o.label.trim());
  const doneN = filledOutcomes.filter((o) => o.done).length;
  const weekPct = filledOutcomes.length ? Math.round((doneN / filledOutcomes.length) * 100) : 0;

  const monthPct = monthly.total ? Math.round((monthly.completed / monthly.total) * 100) : 0;
  const quarterPct = quarterly.total ? Math.round((quarterly.completed / quarterly.total) * 100) : 0;

  const forHerPillar = pillars.find((p) => p.primary);
  const roadmapSum = (forHerPillar?.workstreams || []).reduce((sum, w) => sum + w.pct, 0);
  const overallPct = Math.round(roadmapSum / FORHER_ROADMAP_SIZE);

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

      <div style={{ display: 'inline-flex', background: '#F1EBE0', borderRadius: 99, padding: 4, marginTop: 24, gap: 2 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '9px 18px',
              borderRadius: 99,
              fontFamily: sans,
              fontSize: 13.5,
              fontWeight: 600,
              background: tab === t.id ? '#FFFDF8' : 'transparent',
              color: tab === t.id ? '#A33757' : '#7A6E60',
              boxShadow: tab === t.id ? '0 1px 2px rgba(43, 33, 24, 0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overall' && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'linear-gradient(160deg, #5E2246, #4C1D3D)',
              color: '#F1E9DE',
              borderRadius: 16,
              padding: '26px 30px',
              boxShadow: '0 2px 4px rgba(43, 33, 24, 0.08), 0 14px 36px rgba(43, 33, 24, 0.16)',
            }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CE8AA0' }}>Season</div>
            <div style={{ fontFamily: serif, fontSize: 22, marginTop: 4 }}>Foundation &amp; Validation</div>
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

          <MeterCard
            eyebrow="Overall"
            eyebrowColor="#4A5A3C"
            headline={`${overallPct}% of the roadmap`}
            pct={overallPct}
            barFrom="#8CA57D"
            barTo="#4A5A3C"
            barBg="#E7EBDA"
            footnote={`Measured against the full ${FORHER_ROADMAP_SIZE}-item ForHer workstream roadmap — the agreed scope, not a guess.`}
          />

          <DetailCard title="Pillar movement · live">
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
          </DetailCard>
        </div>
      )}

      {tab === 'quarterly' && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MeterCard
            eyebrow="This quarter"
            eyebrowColor="#8A4F79"
            headline={quarterly.total ? `${quarterly.completed} of ${quarterly.total} due · ${quarterPct}%` : 'Nothing due this quarter'}
            pct={quarterPct}
            barFrom="#C285B0"
            barTo="#8A4F79"
            barBg="#EEE1F0"
            footnote="Everything with a real deadline this quarter — not what feels urgent, what's actually due."
          />
          <DetailCard title="This quarter's tasks">
            <PeriodTaskList
              items={quarterly.items}
              emptyText="Nothing due this quarter yet — plenty of runway."
              onSelect={setSelectedTask}
            />
          </DetailCard>
        </div>
      )}

      {tab === 'monthly' && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MeterCard
            eyebrow="This month"
            eyebrowColor="#8A4F79"
            headline={monthly.total ? `${monthly.completed} of ${monthly.total} due · ${monthPct}%` : 'Nothing due this month'}
            pct={monthPct}
            barFrom="#C285B0"
            barTo="#8A4F79"
            barBg="#EEE1F0"
            footnote="Everything with a real deadline this month — not what feels urgent, what's actually due."
          />
          <DetailCard title="This month's tasks">
            <PeriodTaskList
              items={monthly.items}
              emptyText="Nothing due this month yet — plenty of runway."
              onSelect={setSelectedTask}
            />
          </DetailCard>
        </div>
      )}

      {tab === 'weekly' && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MeterCard
            eyebrow="This week"
            eyebrowColor="#A33757"
            headline={filledOutcomes.length ? `${doneN} of ${filledOutcomes.length} outcomes · ${weekPct}%` : 'No outcomes set yet'}
            pct={weekPct}
            barFrom="#DC586D"
            barTo="#A33757"
            barBg="#F5E3D8"
            footnote="Set at the Board Meeting. Tick them off there as the week moves."
          />
          <DetailCard title="This week's outcomes">
            {filledOutcomes.length === 0 && (
              <div style={{ padding: '13px 0', fontSize: 13, color: '#A79A8A' }}>No outcomes set yet — that&rsquo;s what Sunday&rsquo;s for.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: filledOutcomes.length ? 8 : 0 }}>
              {filledOutcomes.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'baseline', fontSize: 13.5, lineHeight: 1.45, color: o.done ? '#7A6E60' : '#3A2F24' }}>
                  <span style={{ color: o.done ? '#A33757' : '#C4B7A5', flexShrink: 0 }}>{o.done ? '✓' : '○'}</span>
                  <span style={{ textDecoration: o.done ? 'line-through' : 'none' }}>{o.label}</span>
                </div>
              ))}
            </div>
          </DetailCard>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onToggleDone={onToggleTask} />
      )}
    </div>
  );
}
