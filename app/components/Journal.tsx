'use client';

import { useState } from 'react';
import { serif } from '@/lib/theme';

const STORAGE_KEY = 'fcc-journal';

// Real calendar date, not the literal string "today" — that was the bug:
// every entry ever written landed in the same non-dated slot, so nothing
// ever became a real, distinct past day.
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string): string {
  return new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function loadEntries(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

export default function Journal() {
  const todayKey = dateKey(new Date());
  const [entries, setEntries] = useState<Record<string, string>>(loadEntries);
  const [selected, setSelected] = useState(todayKey);

  const updateToday = (val: string) => {
    setEntries((e) => {
      const next = { ...e, [todayKey]: val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isToday = selected === todayKey;
  const label = dayLabel(selected);
  // Only real, actually-written entries — no seeded placeholder days.
  const pastKeys = Object.keys(entries)
    .filter((k) => k !== todayKey && entries[k]?.trim())
    .sort((a, b) => (a < b ? 1 : -1));
  const dates = [{ key: todayKey, label: dayLabel(todayKey), text: entries[todayKey] || '' }].concat(
    pastKeys.map((k) => ({ key: k, label: dayLabel(k), text: entries[k] }))
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '46px 44px 160px 44px' }} className="fcc-fade-up">
      <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Journal</h1>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        One entry a day, in your own words. No prompts, no structure — just a place to think.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 24, marginTop: 30, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'sticky', top: 30 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A', padding: '0 12px 8px 12px' }}>
            Days
          </div>
          {dates.map((d) => {
            const active = selected === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setSelected(d.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '9px 12px',
                  borderRadius: 9,
                  background: active ? '#FBE4DE' : 'transparent',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? '#A33757' : '#5C5145' }}>{d.label}</span>
                <span style={{ fontSize: 11, color: '#A79A8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {d.text ? d.text.slice(0, 40) : d.key === todayKey ? 'Not written yet' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ background: '#FFFDF8', border: '1px solid #EAE2D6', borderRadius: 16, padding: '28px 32px', boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 10px 26px rgba(43, 33, 24, 0.07)', minHeight: 380, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingBottom: 16, borderBottom: '1px solid #F3EDE1' }}>
            <div style={{ fontFamily: serif, fontSize: 21, color: '#2B2118' }}>{label}</div>
            {isToday && (
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A33757', background: '#FBE4DE', padding: '3px 10px', borderRadius: 99 }}>
                Today
              </span>
            )}
          </div>
          {isToday ? (
            <>
              <textarea
                value={entries[todayKey] || ''}
                onChange={(e) => updateToday(e.target.value)}
                placeholder="How did today actually go?"
                style={{ flex: 1, marginTop: 16, width: '100%', minHeight: 280, resize: 'vertical', fontFamily: serif, fontSize: 16.5, lineHeight: 1.7, color: '#2B2118', background: 'transparent', border: 'none', padding: 0 }}
              />
              <div style={{ paddingTop: 12, fontSize: 11.5, color: '#A79A8A' }}>Saved as you type.</div>
            </>
          ) : (
            <div style={{ marginTop: 16, fontFamily: serif, fontSize: 16.5, lineHeight: 1.7, color: '#3A2F24', whiteSpace: 'pre-wrap' }}>
              {entries[selected] || ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
