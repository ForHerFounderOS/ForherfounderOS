'use client';

import { serif } from '@/lib/theme';

function todayLineText() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

const exampleBadge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#8A7E70',
  background: '#F1EBE0',
  padding: '4px 10px',
  borderRadius: 99,
};

export default function DailyBriefing() {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>{todayLineText()} — your briefing</h1>
        <span style={exampleBadge}>Example data — connects to calendar &amp; tasks</span>
      </div>
      <p style={{ margin: '16px 0 0 0', fontFamily: serif, fontSize: 19, fontWeight: 300, lineHeight: 1.6, color: '#4A3F33', maxWidth: 620 }}>
        A steady day: one deep-work block for ForHer this morning, your shift this afternoon, and a clear evening. One hard
        deadline is in sight — the trademark filing on Thursday. If you do one thing before noon, make it the interview
        invites.
      </p>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 8px 22px rgba(43, 33, 24, 0.07)' }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 12 }}>
            Your day, in order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, fontSize: 14 }}>
              <span style={{ color: '#A79A8A' }}>09:00 – 11:00</span>
              <span style={{ color: '#3A2F24' }}>
                <strong style={{ fontWeight: 600, color: '#A33757' }}>Deep work — ForHer.</strong> Interview invites, then
                competitor pricing table.
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, fontSize: 14 }}>
              <span style={{ color: '#A79A8A' }}>13:00 – 18:00</span>
              <span style={{ color: '#3A2F24' }}>Day job shift. Nothing is scheduled against it.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, fontSize: 14 }}>
              <span style={{ color: '#A79A8A' }}>19:30 – 20:15</span>
              <span style={{ color: '#3A2F24' }}>AWS module 3, one session. Short and repeatable beats long and rare.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 14, fontSize: 14 }}>
              <span style={{ color: '#A79A8A' }}>from 20:15</span>
              <span style={{ color: '#6C7A5C' }}>Protected recovery. Kept clear on purpose.</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#FFFDF8', border: '1px solid #E8D3A8', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#B07A20', marginBottom: 10 }}>
              Deadlines in view
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, lineHeight: 1.5, color: '#3A2F24' }}>
              <div>
                <strong style={{ fontWeight: 600 }}>Thu 24 · Trademark filing</strong> — forms drafted, needs final review and
                payment.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>In 12 days · AWS exam window closes</strong> — modules 3 and 4 remain.
              </div>
            </div>
          </div>
          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)' }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', marginBottom: 10 }}>
              Carried forward, no judgement
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5, lineHeight: 1.5, color: '#3A2F24' }}>
              <div>The pricing-research summary moved from yesterday. It&rsquo;s on today&rsquo;s list, sized at ~30 minutes.</div>
              <div style={{ color: '#7A6E60' }}>Yesterday still counted: two tasks done and an interview booked.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
