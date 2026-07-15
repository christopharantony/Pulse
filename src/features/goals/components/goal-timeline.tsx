import { cn } from '@/lib/utils';
import type { GoalDto } from '@/features/goals/api/goals.api';

interface GoalTimelineProps {
  goal: GoalDto;
}

/** Start/target dates, remaining days, and overdue detection for the goal detail page. */
export function GoalTimeline({ goal }: GoalTimelineProps) {
  const start = goal.startDate ? new Date(goal.startDate) : null;
  const target = goal.targetDate ? new Date(goal.targetDate) : null;
  const overdue = !!target && goal.status !== 'completed' && target.getTime() < Date.now();
  const daysRemaining = target ? Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;

  if (!start && !target) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-subtle bg-surface/40 p-4 text-small">
      {start && (
        <div>
          <span className="text-muted-foreground">Started </span>
          <span className="text-foreground">{start.toLocaleDateString()}</span>
        </div>
      )}
      {target && (
        <div>
          <span className="text-muted-foreground">Target </span>
          <span className="text-foreground">{target.toLocaleDateString()}</span>
        </div>
      )}
      {daysRemaining != null && (
        <span className={cn('font-medium', overdue ? 'text-destructive' : 'text-foreground')}>
          {overdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining`}
        </span>
      )}
    </div>
  );
}
