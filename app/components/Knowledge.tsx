'use client';

import { useMemo, useState } from 'react';
import { sans, serif } from '@/lib/theme';

type Tag = 'Decision' | 'Research' | 'Parked idea' | 'Pattern';
const TAG_STYLES: Record<Tag, { tagColor: string; tagBg: string }> = {
  Decision: { tagColor: '#A33757', tagBg: '#FBE4DE' },
  Research: { tagColor: '#8A4F79', tagBg: '#F4E2EE' },
  'Parked idea': { tagColor: '#8F5A12', tagBg: '#F6E8CF' },
  Pattern: { tagColor: '#4A5A3C', tagBg: '#EEF0E6' },
};

const NOTES: { title: string; date: string; tag: Tag; pillar: string; body: string }[] = [
  { title: 'Decision: AWS is a workstream, not a pillar', date: '12 Jul', tag: 'Decision', pillar: 'Founder OS', body: 'Temporary projects don’t get permanent navigation. When the cert is done, the workstream closes and the nav stays clean.' },
  { title: 'Interview #4 — nurse practitioner', date: '10 Jul', tag: 'Research', pillar: 'ForHer', body: 'Strongest signal yet: her patients abandon symptom tracking apps within 2 weeks because they demand daily input. “The app should notice, not ask.”' },
  { title: 'Competitor: Elara Health pricing', date: '9 Jul', tag: 'Research', pillar: 'ForHer', body: '£12.99/mo consumer tier, but their retention lives in the £49 clinician-reviewed tier. Membership beats subscription framing.' },
  { title: 'Decision: no development before 15 interviews', date: '6 Jul', tag: 'Decision', pillar: 'ForHer', body: 'Code written before validation is a liability, not progress. Interviews are the build.' },
  { title: 'Parked: clinic pilot with Dr. Okafor', date: '5 Jul', tag: 'Parked idea', pillar: 'ForHer', body: 'Could be the first B2B channel. Revisit after interview round completes — don’t split focus now.' },
  { title: 'Note: mornings are your deep-work window', date: '2 Jul', tag: 'Pattern', pillar: 'Personal Ops', body: 'Weeks with 2+ protected morning blocks moved ForHer roughly twice as fast. Defend them when semester starts.' },
];

export default function Knowledge() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NOTES;
    return NOTES.filter((n) => (n.title + ' ' + n.body + ' ' + n.tag + ' ' + n.pillar).toLowerCase().includes(q));
  }, [query]);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Knowledge</h1>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A7E70', background: '#F1EBE0', padding: '4px 10px', borderRadius: 99 }}>
          Example notes — external memory connects here
        </span>
      </div>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        Everything you&rsquo;ve decided, learned and parked — searchable, so you never reconstruct it from memory.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search decisions, research notes, parked ideas…"
        style={{
          marginTop: 24,
          width: '100%',
          fontFamily: sans,
          fontSize: 15,
          color: '#2B2118',
          background: '#FFFDF8',
          border: '1px solid #DDD2C1',
          borderRadius: 12,
          padding: '14px 18px',
          boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 8px 22px rgba(43, 33, 24, 0.06)',
        }}
      />

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.map((note) => {
          const t = TAG_STYLES[note.tag];
          return (
            <div key={note.title} style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 6px 18px rgba(43, 33, 24, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#2B2118' }}>{note.title}</div>
                <div style={{ fontSize: 11.5, color: '#A79A8A', flexShrink: 0 }}>{note.date}</div>
              </div>
              <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.55, color: '#5C5145' }}>{note.body}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 7 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.tagColor, background: t.tagBg, padding: '3px 9px', borderRadius: 99 }}>
                  {note.tag}
                </span>
                <span style={{ fontSize: 10.5, color: '#8A7E70', background: '#F1EBE0', padding: '3px 9px', borderRadius: 99 }}>{note.pillar}</span>
              </div>
            </div>
          );
        })}
        {results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '34px 0', color: '#A79A8A', fontSize: 14 }}>
            Nothing matches yet — but it will, once your notes live here.
          </div>
        )}
      </div>
    </div>
  );
}
