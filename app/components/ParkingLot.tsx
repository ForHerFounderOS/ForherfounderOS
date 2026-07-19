'use client';

import { useRef, useState } from 'react';
import { sans } from '@/lib/theme';
import type { ParkingItem } from '@/lib/model';

// Minimal typing for the Web Speech API — not part of TS's default DOM lib,
// and only the handful of members this component actually touches.
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = { 0: SpeechRecognitionAlternative; isFinal: boolean; length: number };
type SpeechRecognitionResultList = { length: number; [index: number]: SpeechRecognitionResult };
type SpeechRecognitionEvent = { resultIndex: number; results: SpeechRecognitionResultList };
type SpeechRecognitionErrorEvent = { error: string };
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Free, browser-only transcription (Web Speech API) plus a quick edit before
// committing — no server round-trip, no API key, no attempt to auto-split a
// ramble into multiple entries. Straight transcript in, one parking lot
// entry out, with a chance to fix whatever the recognizer got wrong.
type RambleMode = 'idle' | 'recording' | 'reviewing';

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

  const [rambleMode, setRambleMode] = useState<RambleMode>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [rambleError, setRambleError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = !!getSpeechRecognitionCtor();

  const submit = () => {
    if (draft.trim()) {
      onAdd(draft.trim());
      setDraft('');
    }
  };

  const resetRamble = () => {
    setRambleMode('idle');
    setTranscript('');
    setInterim('');
    setRambleError(null);
  };

  const startRamble = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setRambleError('Voice capture needs Chrome or Edge.');
      return;
    }
    setTranscript('');
    setInterim('');
    setRambleError(null);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';

    let finalText = '';
    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + ' ';
        else interimText += result[0].transcript;
      }
      setTranscript(finalText);
      setInterim(interimText);
    };
    recognition.onerror = (event) => {
      setRambleError(event.error === 'not-allowed' ? 'Microphone access was denied.' : `Voice capture error: ${event.error}`);
      setRambleMode('idle');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setRambleMode('recording');
    recognition.start();
  };

  const stopRamble = () => {
    recognitionRef.current?.stop();
    const full = (transcript + interim).trim();
    if (full) {
      setTranscript(full);
      setInterim('');
      setRambleMode('reviewing');
    } else {
      resetRamble();
    }
  };

  const addRamble = () => {
    if (transcript.trim()) onAdd(transcript.trim());
    resetRamble();
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
            width: 320,
            background: '#4C1D3D',
            borderRadius: 16,
            padding: '16px 18px 14px 18px',
            boxShadow: '0 6px 18px rgba(76, 29, 61, 0.3), 0 20px 48px rgba(76, 29, 61, 0.32)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#DC8B9D' }}>
              Parking lot · reviewed Sunday
            </div>
            {rambleMode === 'idle' && (
              <button
                onClick={startRamble}
                title={speechSupported ? 'Ramble a stray thought out loud' : 'Voice capture needs Chrome or Edge'}
                disabled={!speechSupported}
                style={{
                  border: '1px solid rgba(255, 187, 148, 0.35)',
                  background: 'rgba(255, 187, 148, 0.1)',
                  color: speechSupported ? '#FFBB94' : '#7A5A63',
                  fontFamily: sans,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 99,
                  cursor: speechSupported ? 'pointer' : 'not-allowed',
                }}
              >
                🎙 Ramble
              </button>
            )}
          </div>

          {rambleMode === 'idle' && (
            <>
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
              {rambleError && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: '#F0A8A8', lineHeight: 1.4 }}>{rambleError}</div>
              )}
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
            </>
          )}

          {rambleMode === 'recording' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#FF6B6B',
                    animation: 'fcc-pulse 1.2s ease-in-out infinite',
                  }}
                />
                <span style={{ fontSize: 12, color: '#F3DCE3' }}>Listening…</span>
              </div>
              <div
                style={{
                  minHeight: 70,
                  maxHeight: 160,
                  overflowY: 'auto',
                  fontFamily: sans,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: '#FCEDE2',
                  background: 'rgba(255, 187, 148, 0.08)',
                  border: '1px solid rgba(255, 187, 148, 0.25)',
                  borderRadius: 9,
                  padding: '9px 12px',
                }}
              >
                {transcript}
                <span style={{ color: '#A86A80' }}>{interim}</span>
                {!transcript && !interim && <span style={{ color: '#A86A80' }}>Say whatever&rsquo;s on your mind…</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={stopRamble}
                  style={{
                    flex: 1,
                    border: 'none',
                    cursor: 'pointer',
                    background: '#FB9590',
                    color: '#4C1D3D',
                    fontFamily: sans,
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: '9px 12px',
                    borderRadius: 8,
                  }}
                >
                  Stop
                </button>
                <button
                  onClick={resetRamble}
                  style={{
                    border: '1px solid rgba(255, 187, 148, 0.25)',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#DC8B9D',
                    fontFamily: sans,
                    fontSize: 12.5,
                    padding: '9px 12px',
                    borderRadius: 8,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {rambleMode === 'reviewing' && (
            <div>
              <div style={{ fontSize: 11, color: '#A86A80', marginBottom: 6 }}>Fix anything the mic misheard, then park it:</div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontFamily: sans,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: '#FCEDE2',
                  background: 'rgba(255, 187, 148, 0.08)',
                  border: '1px solid rgba(255, 187, 148, 0.25)',
                  borderRadius: 9,
                  padding: '9px 12px',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={addRamble}
                  disabled={!transcript.trim()}
                  style={{
                    flex: 1,
                    border: 'none',
                    cursor: transcript.trim() ? 'pointer' : 'not-allowed',
                    background: '#FB9590',
                    color: '#4C1D3D',
                    fontFamily: sans,
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: '9px 12px',
                    borderRadius: 8,
                    opacity: transcript.trim() ? 1 : 0.6,
                  }}
                >
                  Park it
                </button>
                <button
                  onClick={resetRamble}
                  style={{
                    border: '1px solid rgba(255, 187, 148, 0.25)',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#DC8B9D',
                    fontFamily: sans,
                    fontSize: 12.5,
                    padding: '9px 12px',
                    borderRadius: 8,
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
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
