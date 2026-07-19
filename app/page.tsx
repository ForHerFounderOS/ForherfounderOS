'use client';

import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import DailyBriefing from './components/DailyBriefing';
import CalendarIntelligence from './components/CalendarIntelligence';
import Progress from './components/Progress';
import Knowledge from './components/Knowledge';
import Journal from './components/Journal';
import BoardMeeting, { DEFAULT_BOARD_STATE, type BoardState } from './components/BoardMeeting';
import Settings from './components/Settings';
import ParkingLot from './components/ParkingLot';
import type { Screen } from './components/types';
import { useAppData } from '@/lib/useAppData';

function loadBoard(): BoardState {
  if (typeof window === 'undefined') return DEFAULT_BOARD_STATE;
  try {
    const saved = JSON.parse(localStorage.getItem('fcc-board') || 'null');
    if (saved) return { ...DEFAULT_BOARD_STATE, ...saved };
  } catch {}
  return DEFAULT_BOARD_STATE;
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [board, setBoard] = useState<BoardState>(loadBoard);

  const { data, loading, error, refresh, toggleTaskDone, togglePillarActive, addParkingItem, removeParkingItem } = useAppData();

  useEffect(() => {
    // Client-only mount gate: avoids SSR/client hydration mismatch on time-of-day
    // greeting and localStorage-backed state. No lazy-init alternative exists here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('fcc-board', JSON.stringify(board));
    } catch {}
  }, [board, mounted]);

  if (!mounted) return null;

  const pillars = data?.pillars || [];
  const openTasks = data?.openTasks || [];
  const parkingLot = data?.parkingLot || [];
  const stats = data?.stats || { total: 0, completed: 0, open: 0, overdue: 0 };
  const monthly = data?.monthly || { total: 0, completed: 0, items: [] };
  const quarterly = data?.quarterly || { total: 0, completed: 0, items: [] };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#FAEEE4', fontFamily: 'var(--font-instrument-sans), system-ui, sans-serif', color: '#2B2118' }}>
      <Sidebar screen={screen} setScreen={setScreen} />
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {screen === 'home' && (
          <Home
            pillars={pillars}
            openTasks={openTasks}
            stats={stats}
            loading={loading}
            error={error}
            onToggleTask={toggleTaskDone}
            firstMove={data?.firstMove || null}
          />
        )}
        {screen === 'brief' && <DailyBriefing openTasks={openTasks} tasksLoading={loading} tasksError={error} />}
        {screen === 'calendar' && <CalendarIntelligence />}
        {screen === 'progress' && (
          <Progress
            pillars={pillars}
            stats={stats}
            board={board}
            monthly={monthly}
            quarterly={quarterly}
            onToggleTask={toggleTaskDone}
          />
        )}
        {screen === 'knowledge' && <Knowledge />}
        {screen === 'journal' && <Journal />}
        {screen === 'board' && (
          <BoardMeeting
            pillars={pillars}
            openTasks={openTasks}
            stats={stats}
            board={board}
            setBoard={setBoard}
            onClose={() => setScreen('home')}
            refresh={refresh}
          />
        )}
        {screen === 'settings' && (
          <Settings pillars={pillars} loading={loading} error={error} onTogglePillar={togglePillarActive} />
        )}
      </main>
      <ParkingLot items={parkingLot} onAdd={addParkingItem} onRemove={removeParkingItem} />
    </div>
  );
}
