'use client';

import { Trash2Icon, CheckIcon } from '@animateicons/react/lucide';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCompleteMilestone, useDeleteMilestone } from '@/features/goals/hooks/use-milestone-mutations';
import type { MilestoneDto } from '@/features/goals/api/milestones.api';

interface MilestoneItemProps {
  goalId: string;
  milestone: MilestoneDto;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function MilestoneItem({ goalId, milestone, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: MilestoneItemProps) {
  const completeMilestone = useCompleteMilestone();
  const deleteMilestone = useDeleteMilestone();
  const done = milestone.status === 'completed';

  return (
    <li className="flex items-center gap-2 border-b border-border-subtle py-2.5 last:border-b-0">
      <div className="flex flex-col">
        <button type="button" aria-label="Move up" disabled={!canMoveUp} onClick={onMoveUp} className="text-muted-foreground disabled:opacity-30">
          <ChevronUp size={14} />
        </button>
        <button type="button" aria-label="Move down" disabled={!canMoveDown} onClick={onMoveDown} className="text-muted-foreground disabled:opacity-30">
          <ChevronDown size={14} />
        </button>
      </div>

      <button
        type="button"
        disabled={done}
        aria-label={done ? `${milestone.title} completed` : `Complete ${milestone.title}`}
        onClick={() => completeMilestone.mutate({ goalId, milestoneId: milestone.id })}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
          done ? 'border-success bg-success/15 text-success' : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
        )}
      >
        {done && <CheckIcon size={12} isAnimated={false} />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-body', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
          {milestone.title}
        </span>
        {milestone.dueDate && (
          <span className="text-caption text-muted-foreground">Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete ${milestone.title}`}
        onClick={() => deleteMilestone.mutate({ goalId, milestoneId: milestone.id })}
      >
        <Trash2Icon size={14} isAnimated={false} />
      </Button>
    </li>
  );
}
