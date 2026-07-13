'use client';

import { memo } from 'react';
import { CheckIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';
import { useCompleteTask } from '@/features/tasks/hooks/use-complete-task';
import { PriorityBadge } from '@/features/tasks/components/priority-badge';
import { DueDateBadge } from '@/features/tasks/components/due-date-badge';
import { TaskActionsMenu } from '@/features/tasks/components/task-actions-menu';
import { TagChip } from '@/features/tags/components/tag-chip';
import type { TaskListItemDto } from '@/features/tasks/types/task-dto';

interface TaskRowProps {
  task: TaskListItemDto;
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function TaskRowImpl({ task, onOpen, onEdit, selected, onToggleSelect }: TaskRowProps) {
  const completeTask = useCompleteTask();
  const isCompleted = task.status === 'completed';

  return (
    <li
      className={cn(
        'group flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0 hover:bg-surface-elevated/50',
        selected && 'bg-accent/5'
      )}
      role="listitem"
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          aria-label={`Select task ${task.title}`}
          checked={!!selected}
          onChange={() => onToggleSelect(task.id)}
          className="size-4 shrink-0 rounded border-border"
        />
      )}

      <button
        type="button"
        aria-label={isCompleted ? 'Mark as not completed' : 'Mark as completed'}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCompleted) completeTask.mutate(task.id);
        }}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          isCompleted ? 'border-success bg-success text-success-foreground' : 'border-border hover:border-accent'
        )}
      >
        {isCompleted && <CheckIcon size={12} isAnimated={false} />}
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(task.id)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span
          className={cn(
            'truncate text-body',
            isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </span>
        {(task.tags.length > 0 || task.project) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.project && <span className="text-caption text-muted-foreground">{task.project.name}</span>}
            {task.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </span>
        )}
      </button>

      {task.subtaskProgress.total > 0 && (
        <span className="shrink-0 text-caption text-muted-foreground">
          {task.subtaskProgress.completed}/{task.subtaskProgress.total}
        </span>
      )}

      <PriorityBadge priority={task.priority} />
      <DueDateBadge dueDate={task.dueDate} completed={isCompleted} />

      <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <TaskActionsMenu taskId={task.id} status={task.status} onEdit={onEdit ? () => onEdit(task.id) : undefined} />
      </div>
    </li>
  );
}

export const TaskRow = memo(
  TaskRowImpl,
  (prev, next) => prev.task === next.task && prev.selected === next.selected
);
