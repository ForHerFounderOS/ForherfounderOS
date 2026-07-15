'use client';

import { useState } from 'react';
import { sans } from '@/lib/theme';
import type { ParkingItem } from '@/lib/model';

export default function ParkingLot({
  items,
  onAdd,
  onRemove,
}: {
  items: ParkingItem[];
  onAdd: (text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (draft.trim()) {
      onAdd(draft.trim());
      setDraft('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 20,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
      }}
    >
      {open && (
        <div
          className="fcc-fade-up"
          style={{
            width: 300,
            background: '#4C1D3D',
            borderRadius: 16,
            padding: '16px 18px 14px 18px',
            boxShadow: '0 6px 18px rgba(76, 29, 61, 0.3), 0 20px 48px rgba(76, 29, 61, 0.32)',
          }}
        >
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#DC8B9D', marginBottom: 10 }}>
            Parking lot · reviewed Sunday
          </div>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Park a stray thought, press Enter…"
            style={{
              width: '100%',
              fontFamily: sans,
              fontSize: 13,
              color: '#FCEDE2',
              background: 'rgba(255, 187, 148, 0.08)',
              border: '1px solid rgba(255, 187, 148, 0.25)',
              borderRadius: 9,
              padding: '9px 12px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 190, overflowY: 'auto', marginTop: 6 }}>
            {items.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'baseline',
                  padding: '8px 2px',
                  borderBottom: '1px solid rgba(255, 187, 148, 0.12)',
                  fontSize: 12.5,
                  color: '#F3DCE3',
                  lineHeight: 1.4,
                }}
              >
                <span>{p.text}</span>
                <button
                  onClick={() => onRemove(p.id)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#A86A80', fontSize: 11, padding: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ padding: '8px 2px', fontSize: 12, color: '#A86A80' }}>Nothing parked yet.</div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(150deg, #852E4E, #4C1D3D)',
          color: '#FCEDE2',
          fontFamily: sans,
          fontSize: 12,
          fontWeight: 600,
          padding: '9px 15px',
          borderRadius: 99,
          boxShadow: '0 3px 10px rgba(76, 29, 61, 0.3), 0 10px 26px rgba(76, 29, 61, 0.28)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFBB94', flexShrink: 0 }} />
        {items.length} parked
      </button>
    </div>
  );
}
