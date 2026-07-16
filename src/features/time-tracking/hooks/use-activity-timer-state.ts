import { useEffect, useState } from 'react';
import { useRunningSession } from '@/features/time-tracking/hooks/use-running-session';

/**
 * Derives "is this specific task/goal/habit the one currently being timed" from the shared
 * `useRunningSession()` cache instead of component-local state, so starting/stopping/switching a
 * timer from anywhere in the app (the Time Tracker page, a different entity's detail panel)
 * immediately reflects here too, once the mutation that changed it invalidates `timeTrackingKeys`.
 */
export function useActivityTimerState(sourceType: string, sourceId: string) {
  const { data: running, isLoading } = useRunningSession();
  const isRunning = running?.sourceType === sourceType && running?.sourceId === sourceId;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || !running) {
      setElapsedSeconds(0);
      return;
    }
    const startedAt = new Date(running.startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, running]);

  return {
    isLoading,
    isRunning,
    sessionId: isRunning ? (running?.sessionId ?? null) : null,
    elapsedSeconds,
  };
}
