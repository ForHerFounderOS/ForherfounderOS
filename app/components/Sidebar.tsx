'use client';

import { serif, sans } from '@/lib/theme';
import type { Screen } from './types';

const NAV: { key: Screen; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'brief', label: 'Daily Briefing' },
  { key: 'calendar', label: 'Calendar Intelligence' },
  { key: 'progress', label: 'Progress' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'journal', label: 'Journal' },
];

export default function Sidebar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const boardActive = screen === 'board';
  const settingsActive = screen === 'settings';

  return (
    <nav
      style={{
        width: 236,
        flexShrink: 0,
        background: 'linear-gradient(175deg, #4C1D3D 0%, #38152E 100%)',
        color: '#EFE7DC',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 16px 20px 16px',
      }}
    >
      <div style={{ padding: '0 12px' }}>
        <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 500, letterSpacing: '0.01em', color: '#F4EDE3' }}>
          Command Center
        </div>
        <div
          style={{
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#FB9590',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FB9590', display: 'inline-block' }} />
          Foundation &amp; Validation
        </div>
      </div>

      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ padding: '0 12px 8px 12px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#BE8398' }}>
          Daily
        </div>
        {NAV.map((n) => {
          const active = screen === n.key;
          return (
            <button
              key={n.key}
              onClick={() => setScreen(n.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                padding: '9px 12px',
                borderRadius: 9,
                fontFamily: sans,
                fontSize: 14,
                background: active ? 'rgba(251, 149, 144, 0.16)' : 'transparent',
                color: active ? '#F4EDE3' : '#D8B3AD',
                fontWeight: active ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: active ? '#FB9590' : 'transparent',
                  flexShrink: 0,
                }}
              />
              {n.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ padding: '0 12px 8px 12px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#BE8398' }}>
          Rituals
        </div>
        <button
          onClick={() => setScreen('board')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
            border: '1px solid rgba(251, 149, 144, 0.25)',
            cursor: 'pointer',
            padding: '10px 12px',
            borderRadius: 9,
            fontFamily: sans,
            fontSize: 14,
            background: boardActive ? 'rgba(251, 149, 144, 0.18)' : 'rgba(251, 149, 144, 0.06)',
            color: boardActive ? '#F4EDE3' : '#F4C6C0',
            fontWeight: 500,
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: '50%', background: boardActive ? '#FB9590' : 'transparent', flexShrink: 0 }}
          />
          Weekly Board Meeting
        </button>
        <div style={{ padding: '6px 12px 0 12px', fontSize: 11.5, lineHeight: 1.5, color: '#BE8398' }}>
          Sundays, 45 min. Next: this Sunday.
        </div>
      </div>

      <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ padding: '0 12px 8px 12px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#BE8398' }}>
          System
        </div>
        <button
          onClick={() => setScreen('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
            border: 'none',
            cursor: 'pointer',
            padding: '9px 12px',
            borderRadius: 9,
            fontFamily: sans,
            fontSize: 14,
            background: settingsActive ? 'rgba(251, 149, 144, 0.16)' : 'transparent',
            color: settingsActive ? '#F4EDE3' : '#D8B3AD',
            fontWeight: 500,
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: '50%', background: settingsActive ? '#FB9590' : 'transparent', flexShrink: 0 }}
          />
          Settings
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: '14px 12px 0 12px', borderTop: '1px solid rgba(244, 237, 227, 0.08)' }}>
        <div style={{ fontSize: 12, color: '#D8B3AD', lineHeight: 1.55 }}>
          Unfinished work carries forward on its own. Nothing here keeps score.
        </div>
      </div>
    </nav>
  );
}
