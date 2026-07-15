'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { GoalActionsMenu } from '@/features/goals/components/goal-actions-menu';
import { GoalCategoryBadge } from '@/features/goals/components/goal-category-badge';
import { GoalPriorityBadge } from '@/features/goals/components/goal-priority-badge';
import { GoalProgressBar } from '@/features/goals/components/goal-progress-bar';
import type { GoalDto } from '@/features/goals/api/goals.api';

interface GoalCardProps {
  goal: GoalDto;
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function daysRemainingLabel(targetDate: string | null): string | null {
  if (!targetDate) return null;
  const days = Math.ceil((new Date(targetDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
}

function GoalCardImpl({ goal, onOpen, onEdit }: GoalCardProps) {
  const done = goal.status === 'completed';
  const overdue = !done && goal.targetDate && new Date(goal.targetDate).getTime() < Date.now();
  const remaining = daysRemainingLabel(goal.targetDate);

  return (
    <li
      className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface/40 p-4 transition-colors hover:bg-surface-elevated/50"
      role="listitem"
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onOpen?.(goal.id)} className="flex min-w-0 flex-1 flex-col items-start text-left">
          <span className={cn('truncate text-body font-medium', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
            {goal.icon ? `${goal.icon} ` : ''}
            {goal.title}
          </span>
          {goal.description && <span className="truncate text-caption text-muted-foreground">{goal.description}</span>}
        </button>
        <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <GoalActionsMenu goalId={goal.id} archived={goal.status === 'archived'} completed={done} onEdit={onEdit ? () => onEdit(goal.id) : undefined} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <GoalCategoryBadge category={goal.category} customLabel={goal.customCategoryLabel} />
        <GoalPriorityBadge priority={goal.priority} />
        {remaining && (
          <span className={cn('text-caption', overdue ? 'text-destructive' : 'text-muted-foreground')}>{remaining}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <GoalProgressBar progressPct={goal.progressPct} className="flex-1" />
        <span className="text-caption tabular-nums text-muted-foreground">{goal.progressPct}%</span>
      </div>
    </li>
  );
}

export const GoalCard = memo(GoalCardImpl, (prev, next) => prev.goal === next.goal);
