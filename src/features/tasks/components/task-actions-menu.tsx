'use client';

import { CopyIcon, Trash2Icon } from '@animateicons/react/lucide';
import { MoreHorizontal, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDuplicateTask } from '@/features/tasks/hooks/use-duplicate-task';
import { useArchiveTask, useUnarchiveTask } from '@/features/tasks/hooks/use-archive-task';
import { useDeleteTask } from '@/features/tasks/hooks/use-delete-task';
import type { TaskStatus } from '@/features/tasks/types/task';

interface TaskActionsMenuProps {
  taskId: string;
  status?: TaskStatus;
  onEdit?: () => void;
}

export function TaskActionsMenu({ taskId, status, onEdit }: TaskActionsMenuProps) {
  const duplicateTask = useDuplicateTask();
  const archiveTask = useArchiveTask();
  const unarchiveTask = useUnarchiveTask();
  const deleteTask = useDeleteTask();
  const isArchived = status === 'archived';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Task actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil size={14} />
            Edit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => duplicateTask.mutate(taskId)}>
          <CopyIcon size={14} isAnimated={false} />
          Duplicate
        </DropdownMenuItem>
        {isArchived ? (
          <DropdownMenuItem onSelect={() => unarchiveTask.mutate({ id: taskId })}>
            <ArchiveRestore size={14} />
            Unarchive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => archiveTask.mutate(taskId)}>
            <Archive size={14} />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={() => deleteTask.mutate(taskId)}>
          <Trash2Icon size={14} isAnimated={false} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
