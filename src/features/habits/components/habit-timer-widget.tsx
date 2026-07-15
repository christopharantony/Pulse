'use client';

import { useEffect, useState } from 'react';
import { PlayIcon, PauseIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { useStartHabitTimer, useStopHabitTimer } from '@/features/habits/hooks/use-habit-timer';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Start/stop control for a duration habit's live timer. Running-session state is component-local
 * (pure client UI state, not server state) — only one timer can run at a time and it's rendered in
 * one place, so a global store isn't warranted; promote it only if a second surface needs the
 * live value (e.g. a persistent header widget).
 */
export function HabitTimerWidget({ habitId }: { habitId: string }) {
  const startTimer = useStartHabitTimer();
  const stopTimer = useStopHabitTimer();
  const [session, setSession] = useState<{ id: string; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  async function handleStart() {
    const result = await startTimer.mutateAsync({ id: habitId });
    setSession({ id: result.sessionId, startedAt: new Date(result.startedAt).getTime() });
  }

  async function handleStop() {
    if (!session) return;
    await stopTimer.mutateAsync({ id: habitId, sessionId: session.id });
    setSession(null);
    setElapsed(0);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/40 p-3">
      <span className="font-mono text-h3 tabular-nums text-foreground">{formatElapsed(elapsed)}</span>
      {session ? (
        <Button type="button" variant="destructive" size="sm" onClick={handleStop} isLoading={stopTimer.isPending}>
          <PauseIcon size={14} isAnimated={false} />
          Stop
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={handleStart} isLoading={startTimer.isPending}>
          <PlayIcon size={14} isAnimated={false} />
          Start
        </Button>
      )}
    </div>
  );
}
