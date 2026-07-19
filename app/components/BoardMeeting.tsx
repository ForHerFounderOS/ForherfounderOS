'use client';

import { useState } from 'react';
import { serif, sans } from '@/lib/theme';
import type { ViewPillar } from '@/lib/model';

export type Decision = { id: number; text: string; recorded?: boolean };
export type BoardState = {
  wins: string[];
  outcomes: string[];
  outcomesDone: boolean[];
  outcomeWorkstreamIds: (string | null)[];
  outcomeTaskIds: (string | null)[];
  priorityWorkstreamId: string;
  planRecovery: string;
  decisions: Decision[];
  lastFinishedDate: string | null;
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
  lastFinishedDate: null,
};

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

export default function BoardMeeting({
  pillars,
  board,
  setBoard,
  onClose,
  refresh,
}: {
  pillars: ViewPillar[];
  board: BoardState;
  setBoard: (b: BoardState) => void;
  onClose: () => void;
  refresh: () => void;
}) {
  const [decisionDraft, setDecisionDraft] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const activePillars = pillars.filter((p) => p.primary || p.active);
  const workstreamOptions = pillars.flatMap((p) => p.workstreams.map((w) => ({ id: w.id, label: `${p.name} · ${w.name}` })));

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

      const nextBoard: BoardState = {
        ...board,
        outcomeTaskIds,
        decisions,
        lastFinishedDate: json.weeklyReviewCreated ? todayKey() : board.lastFinishedDate,
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
        <p style={{ margin: '6px 0 14px 30px', fontSize: 13, color: '#A79A8A' }}>
          Decide once, write it down, stop re-deciding it. Logged to Knowledge on approval.
        </p>
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
              {d.recorded && (
                <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4A5A3C', background: '#EEF0E6', padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}>
                  Logged
                </span>
              )}
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
