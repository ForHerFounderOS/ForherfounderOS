'use client';

import { useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar } from '@/lib/model';

export type Decision = { id: number; text: string };
export type BoardState = {
  wins: string[];
  outcomes: string[];
  outcomesDone: boolean[];
  planPriority: string;
  planRecovery: string;
  decisions: Decision[];
};

export const DEFAULT_BOARD_STATE: BoardState = {
  wins: ['', '', ''],
  outcomes: ['', '', ''],
  outcomesDone: [false, false, false],
  planPriority: '',
  planRecovery: '',
  decisions: [],
};

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

export default function BoardMeeting({
  pillars,
  board,
  setBoard,
  onClose,
}: {
  pillars: ViewPillar[];
  board: BoardState;
  setBoard: (b: BoardState) => void;
  onClose: () => void;
}) {
  const [decisionDraft, setDecisionDraft] = useState('');
  const activePillars = pillars.filter((p) => p.primary || p.active);

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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 15, color: '#D08A9B' }}>01</span>
          <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 22 }}>Wins first</h2>
        </div>
        <p style={{ margin: '6px 0 14px 30px', fontSize: 13, color: '#A79A8A' }}>Before anything else. Small counts.</p>
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

      {/* 03 Company review */}
      <section style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 15, color: '#D08A9B' }}>02</span>
          <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 22 }}>Company review</h2>
        </div>
        <p style={{ margin: '6px 0 14px 30px', fontSize: 13, color: '#A79A8A' }}>Active pillars only. Dormant ones don&rsquo;t report.</p>
        <div style={{ marginLeft: 30, background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '8px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
          {activePillars.map((row) => (
            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, padding: '14px 0', borderTop: '1px solid #F3EDE1', alignItems: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2B2118' }}>{row.name}</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5C5145' }}>
                {row.pct}% overall · {row.workstreams.length} workstream{row.workstreams.length === 1 ? '' : 's'}
                {row.workstreams.length ? ` · next: ${row.workstreams[0].next}` : ''}
              </div>
            </div>
          ))}
          {activePillars.length === 0 && (
            <div style={{ padding: '14px 0', fontSize: 13.5, color: '#A79A8A' }}>No active pillars to review.</div>
          )}
        </div>
      </section>

      {/* 04 Decisions */}
      <section style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 15, color: '#D08A9B' }}>03</span>
          <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 22 }}>Decisions</h2>
        </div>
        <p style={{ margin: '6px 0 14px 30px', fontSize: 13, color: '#A79A8A' }}>Decide once, write it down, stop re-deciding it.</p>
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
              }}
            >
              <span style={{ color: '#A33757', fontSize: 13 }}>✦</span>
              {d.text}
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 15, color: '#D08A9B' }}>04</span>
          <h2 style={{ margin: 0, fontFamily: serif, fontWeight: 500, fontSize: 22 }}>Plan the week</h2>
        </div>
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
            <input
              value={board.planPriority}
              onChange={(e) => setBoard({ ...board, planPriority: e.target.value })}
              placeholder="If only one thing moves next week, it&rsquo;s…"
              style={{ width: '100%', fontFamily: serif, fontSize: 18, color: '#F1E9DE', background: 'rgba(244, 237, 227, 0.07)', border: '1px solid rgba(244, 237, 227, 0.18)', borderRadius: 11, padding: '13px 17px' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#CE8AA0', marginBottom: 8 }}>
              Three outcomes, not thirty tasks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {board.outcomes.map((val, i) => {
                const done = !!board.outcomesDone[i];
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                );
              })}
            </div>
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
          <button
            onClick={onClose}
            style={{ alignSelf: 'flex-start', border: 'none', cursor: 'pointer', background: '#FB9590', color: '#4C1D3D', fontFamily: sans, fontSize: 14, fontWeight: 600, padding: '11px 22px', borderRadius: 9 }}
          >
            Close the meeting
          </button>
        </div>
      </section>
    </div>
  );
}
