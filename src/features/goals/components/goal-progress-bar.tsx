import { cn } from '@/lib/utils';

interface GoalProgressBarProps {
  progressPct: number;
  className?: string;
}

/** Compact linear progress indicator for list/card views — the `ProgressRing`'s flat counterpart. */
export function GoalProgressBar({ progressPct, className }: GoalProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progressPct));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-slow ease-expo-out motion-reduce:transition-none"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
