'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ViewPillar, ViewTask, ParkingItem, PeriodStats, ViewPriority } from './model';

type Stats = { total: number; completed: number; open: number; overdue: number };
type Data = {
  pillars: ViewPillar[];
  openTasks: ViewTask[];
  todayPlan: ViewTask[];
  parkingLot: ParkingItem[];
  stats: Stats;
  monthly: PeriodStats;
  quarterly: PeriodStats;
  firstMove: ViewTask | null;
  priorityWorkstreamId: string | null;
  priorityWorkstreamName: string | null;
  priorities: ViewPriority[];
};

export function useAppData() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial client-side data fetch from our API route; setState happens
    // inside the async continuation, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const toggleTaskDone = useCallback(
    async (id: string) => {
      setData((prev) => (prev ? { ...prev, openTasks: prev.openTasks.filter((t) => t.id !== id) } : prev));
      try {
        const res = await fetch('/api/tasks/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, done: true }),
        });
        if (!res.ok) throw new Error('Failed to update task');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task');
        refresh();
      }
    },
    [refresh]
  );

  const togglePillarActive = useCallback(
    async (id: string, active: boolean) => {
      setData((prev) =>
        prev ? { ...prev, pillars: prev.pillars.map((p) => (p.id === id ? { ...p, active } : p)) } : prev
      );
      try {
        const res = await fetch('/api/pillars/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, active }),
        });
        if (!res.ok) throw new Error('Failed to update pillar');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update pillar');
        refresh();
      }
    },
    [refresh]
  );

  const addParkingItem = useCallback(
    async (text: string) => {
      const tempId = 'temp-' + Date.now();
      setData((prev) =>
        prev ? { ...prev, parkingLot: [{ id: tempId, text, dateAdded: null }, ...prev.parkingLot] } : prev
      );
      try {
        const res = await fetch('/api/parking-lot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to park item');
        setData((prev) =>
          prev
            ? { ...prev, parkingLot: prev.parkingLot.map((p) => (p.id === tempId ? { ...p, id: json.id } : p)) }
            : prev
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to park item');
        refresh();
      }
    },
    [refresh]
  );

  const removeParkingItem = useCallback(
    async (id: string) => {
      setData((prev) => (prev ? { ...prev, parkingLot: prev.parkingLot.filter((p) => p.id !== id) } : prev));
      try {
        const res = await fetch('/api/parking-lot', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error('Failed to remove item');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove item');
        refresh();
      }
    },
    [refresh]
  );

  return { data, loading, error, refresh, toggleTaskDone, togglePillarActive, addParkingItem, removeParkingItem };
}
