'use client';

import { Trash2Icon, CheckIcon } from '@animateicons/react/lucide';
import { MoreHorizontal, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useArchiveGoal, useUnarchiveGoal } from '@/features/goals/hooks/use-archive-goal';
import { useCompleteGoal } from '@/features/goals/hooks/use-complete-goal';
import { useDeleteGoal } from '@/features/goals/hooks/use-delete-goal';

interface GoalActionsMenuProps {
  goalId: string;
  archived?: boolean;
  completed?: boolean;
  onEdit?: () => void;
}

export function GoalActionsMenu({ goalId, archived, completed, onEdit }: GoalActionsMenuProps) {
  const archiveGoal = useArchiveGoal();
  const unarchiveGoal = useUnarchiveGoal();
  const completeGoal = useCompleteGoal();
  const deleteGoal = useDeleteGoal();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label="Goal actions" onClick={(e) => e.stopPropagation()}>
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
        {!completed && (
          <DropdownMenuItem onSelect={() => completeGoal.mutate(goalId)}>
            <CheckIcon size={14} isAnimated={false} />
            Mark complete
          </DropdownMenuItem>
        )}
        {archived ? (
          <DropdownMenuItem onSelect={() => unarchiveGoal.mutate(goalId)}>
            <ArchiveRestore size={14} />
            Unarchive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => archiveGoal.mutate(goalId)}>
            <Archive size={14} />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={() => deleteGoal.mutate(goalId)}>
          <Trash2Icon size={14} isAnimated={false} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
