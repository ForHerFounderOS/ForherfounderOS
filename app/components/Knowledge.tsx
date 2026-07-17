'use client';

import { useEffect, useMemo, useState } from 'react';
import { sans, serif } from '@/lib/theme';

type Note = { id: string; text: string; type: string; date: string | null };

const TAG_STYLES: Record<string, { tagColor: string; tagBg: string }> = {
  Decision: { tagColor: '#A33757', tagBg: '#FBE4DE' },
  Research: { tagColor: '#8A4F79', tagBg: '#F4E2EE' },
  'Parked idea': { tagColor: '#8F5A12', tagBg: '#F6E8CF' },
  Pattern: { tagColor: '#4A5A3C', tagBg: '#EEF0E6' },
};
const DEFAULT_TAG_STYLE = { tagColor: '#7A6E60', tagBg: '#F1EBE0' };

function dateLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Knowledge() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/knowledge')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setError(json.error);
        else setNotes(json.notes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const all = notes || [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((n) => (n.text + ' ' + n.type).toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '46px 44px 140px 44px' }} className="fcc-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 30 }}>Knowledge</h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: error ? '#A24E2E' : '#4A5A3C',
            background: error ? '#FBE9DC' : '#EEF0E6',
            padding: '4px 10px',
            borderRadius: 99,
          }}
        >
          {loading ? 'Loading…' : error ? 'Connection error' : 'Live · Airtable'}
        </span>
      </div>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#7A6E60', maxWidth: 560, lineHeight: 1.55 }}>
        Everything you&rsquo;ve decided, learned and parked — searchable, so you never reconstruct it from memory.
      </p>

      {error && (
        <div
          style={{
            marginTop: 20,
            background: '#FBE9DC',
            border: '1px solid #EAC4A8',
            borderRadius: 12,
            padding: '14px 18px',
            fontSize: 13.5,
            color: '#6E3018',
          }}
        >
          Couldn&rsquo;t reach Airtable: {error}
        </div>
      )}

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
          const t = TAG_STYLES[note.type] || DEFAULT_TAG_STYLE;
          return (
            <div
              key={note.id}
              style={{
                background: '#FFFDF8',
                border: '1px solid #EAE2D6',
                borderRadius: 14,
                padding: '18px 22px',
                boxShadow: '0 1px 2px rgba(43, 33, 24, 0.05), 0 6px 18px rgba(43, 33, 24, 0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#3A2F24' }}>{note.text}</div>
                <div style={{ fontSize: 11.5, color: '#A79A8A', flexShrink: 0 }}>{dateLabel(note.date)}</div>
              </div>
              {note.type && (
                <div style={{ marginTop: 10, display: 'flex', gap: 7 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: t.tagColor,
                      background: t.tagBg,
                      padding: '3px 9px',
                      borderRadius: 99,
                    }}
                  >
                    {note.type}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {!loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '34px 0', color: '#A79A8A', fontSize: 14 }}>
            {notes && notes.length === 0 ? 'Nothing in Knowledge yet — add a record in Airtable.' : 'Nothing matches your search.'}
          </div>
        )}
      </div>
    </div>
  );
}
