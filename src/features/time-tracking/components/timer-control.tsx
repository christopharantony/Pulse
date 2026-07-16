'use client';

import { useEffect, useState } from 'react';
import { PlayIcon, PauseIcon, LoaderCircleIcon } from '@animateicons/react/lucide';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/feedback/skeleton';
import { cn } from '@/lib/utils';
import { formatElapsedTime } from '@/lib/time/format';
import { useRunningSession } from '@/features/time-tracking/hooks/use-running-session';
import { useTodaySummary } from '@/features/time-tracking/hooks/use-today-summary';
import { useStartTimer } from '@/features/time-tracking/hooks/use-start-timer';
import { useStopTimer } from '@/features/time-tracking/hooks/use-stop-timer';
import { StartTimerCombobox } from '@/features/time-tracking/components/start-timer-combobox';

/**
 * The Time Tracker page's central, dominant timer card. Unlike `GoalTimerWidget`/`HabitTimerWidget`/
 * `TaskTimerWidget` (whose running state now comes from `useActivityTimerState`, matched against a
 * specific entity id), this is the "any timer, whichever it is" view, so it seeds straight from
 * `useRunningSession()` — the server's global "one timer per user" state.
 */
export function TimerControl() {
  const { data: running, isLoading: runningLoading } = useRunningSession();
  const { data: today } = useTodaySummary();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const [title, setTitle] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [liveToday, setLiveToday] = useState(0);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      return;
    }
    const startedAt = new Date(running.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!today?.runningStartedAt) {
      setLiveToday(0);
      return;
    }
    const startedAt = new Date(today.runningStartedAt).getTime();
    const tick = () => setLiveToday(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [today?.runningStartedAt]);

  async function handleStart() {
    const trimmed = title.trim();
    if (!trimmed) return;
    await startTimer.mutateAsync({ title: trimmed });
    setTitle('');
  }

  async function handleStop() {
    if (!running) return;
    await stopTimer.mutateAsync({ sessionId: running.sessionId });
  }

  if (runningLoading) return <CardSkeleton />;

  const todaySeconds = (today?.completedSeconds ?? 0) + liveToday;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Badge variant={running ? 'success' : 'default'} className="gap-1.5">
          <span className={cn('size-1.5 rounded-full', running ? 'bg-success' : 'bg-muted-foreground')} />
          {running ? 'Tracking' : 'Paused'}
        </Badge>
        <div className="text-right">
          <div className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Today</div>
          <div className="font-mono text-h3 tabular-nums text-foreground">{formatElapsedTime(todaySeconds)}</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 text-center">
        {running ? (
          <>
            <div className="flex flex-col items-center gap-1">
              <span className="text-label uppercase tracking-wide text-muted-foreground">Tracking</span>
              <h2 className="text-h3 text-foreground">{running.activityTitle}</h2>
            </div>
            <div className="w-full max-w-xs border-t border-border-subtle" />
          </>
        ) : (
          <form
            className="w-full max-w-sm"
            onSubmit={(event) => {
              event.preventDefault();
              handleStart();
            }}
          >
            <StartTimerCombobox value={title} onChange={setTitle} onActivityStarted={() => setTitle('')} />
          </form>
        )}

        <span className="font-mono text-display tabular-nums text-foreground sm:text-[3.5rem]">
          {formatElapsedTime(elapsed)}
        </span>

        <div className="flex items-center justify-center gap-4">
          {running ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={stopTimer.isPending}
              aria-label="Stop timer"
              className="flex size-16 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground shadow-sm transition-colors duration-base hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PauseIcon size={22} isAnimated={false} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={startTimer.isPending || !title.trim()}
              aria-label="Start timer"
              className="flex size-16 items-center justify-center rounded-full bg-success text-background shadow-glow transition-colors duration-base hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {startTimer.isPending ? (
                <LoaderCircleIcon size={22} isAnimated={false} className="animate-spin" />
              ) : (
                <PlayIcon size={24} isAnimated={false} className="ml-0.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
