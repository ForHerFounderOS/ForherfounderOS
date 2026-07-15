'use client';

import { serif } from '@/lib/theme';

type Kind = 'forher' | 'job' | 'career' | 'recovery' | 'deadline';
const STYLES: Record<Kind, { bg: string; border: string; timeColor: string; textColor: string }> = {
  forher: { bg: '#FBE4DE', border: '#F5C6C1', timeColor: '#A33757', textColor: '#852E4E' },
  job: { bg: '#F1EBE0', border: '#E2D7C4', timeColor: '#8A7E70', textColor: '#4A3F33' },
  career: { bg: '#F6EDD9', border: '#E8D3A8', timeColor: '#8F5A12', textColor: '#5C4110' },
  recovery: { bg: '#EEF0E6', border: '#CBD3B8', timeColor: '#6C7A5C', textColor: '#3E4A33' },
  deadline: { bg: '#FBE9DC', border: '#EAC4A8', timeColor: '#A24E2E', textColor: '#6E3018' },
};

const DAYS: { name: string; dateNum: string; events: { time: string; label: string; kind: Kind }[] }[] = [
  { name: 'Mon', dateNum: '21', events: [
    { time: '13:00', label: 'Day job shift', kind: 'job' },
    { time: '19:30', label: 'AWS module 3', kind: 'career' },
  ] },
  { name: 'Tue', dateNum: '22', events: [
    { time: '09:00', label: 'Deep work — ForHer interviews', kind: 'forher' },
    { time: '13:00', label: 'Day job shift', kind: 'job' },
  ] },
  { name: 'Wed', dateNum: '23', events: [
    { time: '10:00', label: 'Interview #5 — midwife', kind: 'forher' },
    { time: '19:00', label: 'Protected recovery', kind: 'recovery' },
  ] },
  { name: 'Thu', dateNum: '24', events: [
    { time: '09:30', label: 'Trademark filing — hard deadline', kind: 'deadline' },
    { time: '13:00', label: 'Day job shift', kind: 'job' },
    { time: '19:30', label: 'AWS module 4', kind: 'career' },
  ] },
  { name: 'Fri', dateNum: '25', events: [
    { time: '09:00', label: 'Deep work — pricing research', kind: 'forher' },
    { time: '11:00', label: 'Interviews #7 & #8', kind: 'forher' },
  ] },
];

export default function CalendarIntelligence() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Calendar Intelligence</h1>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A7E70', background: '#F1EBE0', padding: '4px 10px', borderRadius: 99 }}>
          Example week — connect your calendar to go live
        </span>
      </div>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        Not a calendar to manage — a read on the week you already have: where the deep work fits, where it doesn&rsquo;t, and
        what&rsquo;s protected.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginTop: 28, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {DAYS.map((day, i) => (
            <div
              key={day.name}
              style={{
                background: i === 1 ? '#FFFDF8' : '#FCF9F2',
                border: `1px solid ${i === 1 ? '#D9C7B3' : '#EAE2D6'}`,
                borderRadius: 14,
                padding: '14px 12px',
                boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)',
                minHeight: 320,
              }}
            >
              <div style={{ textAlign: 'center', paddingBottom: 10, borderBottom: '1px solid #F0E9DD', marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: i === 1 ? '#A33757' : '#A79A8A', fontWeight: 600 }}>
                  {day.name}
                </div>
                <div style={{ fontFamily: serif, fontSize: 19, color: '#2B2118', marginTop: 2 }}>{day.dateNum}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {day.events.map((ev, j) => {
                  const s = STYLES[ev.kind];
                  return (
                    <div key={j} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: s.timeColor, fontWeight: 600, letterSpacing: '0.03em' }}>{ev.time}</div>
                      <div style={{ fontSize: 12, color: s.textColor, lineHeight: 1.35, marginTop: 2, fontWeight: 500 }}>{ev.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', paddingLeft: 4 }}>
            What the week says
          </div>
          <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)', fontSize: 13.5, lineHeight: 1.55, color: '#3A2F24' }}>
            <strong style={{ fontWeight: 600, color: '#A33757' }}>Deep work fits twice.</strong> Tuesday and Friday mornings are
            your only 2-hour ForHer blocks. The interview calls should land there.
          </div>
          <div style={{ background: '#FBF4E6', border: '1px solid #E8D3A8', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)', fontSize: 13.5, lineHeight: 1.55, color: '#3A2F24' }}>
            <strong style={{ fontWeight: 600, color: '#8F5A12' }}>Thursday is heavy.</strong> A shift, the trademark deadline
            and an AWS session in one day. Move the AWS session to Wednesday evening?
          </div>
          <div style={{ background: '#EEF0E6', border: '1px solid #CBD3B8', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05)', fontSize: 13.5, lineHeight: 1.55, color: '#3A2F24' }}>
            <strong style={{ fontWeight: 600, color: '#4A5A3C' }}>Recovery is protected.</strong> Wednesday and Sunday
            evenings are held clear. They don&rsquo;t get traded for tasks.
          </div>
        </div>
      </div>
    </div>
  );
}
