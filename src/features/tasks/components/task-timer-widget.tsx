'use client';

import { PlayIcon, PauseIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { formatElapsedTime } from '@/lib/time/format';
import { useStartTaskTimer, useStopTaskTimer } from '@/features/tasks/hooks/use-task-timer';
import { useActivityTimerState } from '@/features/time-tracking/hooks/use-activity-timer-state';

/** Start/stop control for a task's live timer. Mirrors GoalTimerWidget/HabitTimerWidget. */
export function TaskTimerWidget({ taskId }: { taskId: string }) {
  const startTimer = useStartTaskTimer();
  const stopTimer = useStopTaskTimer();
  const { isRunning, sessionId, elapsedSeconds } = useActivityTimerState('task', taskId);

  async function handleStart() {
    await startTimer.mutateAsync({ taskId });
  }

  async function handleStop() {
    if (!sessionId) return;
    await stopTimer.mutateAsync({ taskId, sessionId });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/40 p-3">
      <span className="font-mono text-h3 tabular-nums text-foreground">{formatElapsedTime(elapsedSeconds)}</span>
      {isRunning ? (
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
