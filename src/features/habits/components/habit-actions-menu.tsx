'use client';

import { Trash2Icon } from '@animateicons/react/lucide';
import { MoreHorizontal, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useArchiveHabit, useUnarchiveHabit } from '@/features/habits/hooks/use-archive-habit';
import { useDeleteHabit } from '@/features/habits/hooks/use-delete-habit';

interface HabitActionsMenuProps {
  habitId: string;
  archived?: boolean;
  onEdit?: () => void;
}

export function HabitActionsMenu({ habitId, archived, onEdit }: HabitActionsMenuProps) {
  const archiveHabit = useArchiveHabit();
  const unarchiveHabit = useUnarchiveHabit();
  const deleteHabit = useDeleteHabit();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Habit actions"
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
        {archived ? (
          <DropdownMenuItem onSelect={() => unarchiveHabit.mutate(habitId)}>
            <ArchiveRestore size={14} />
            Unarchive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => archiveHabit.mutate(habitId)}>
            <Archive size={14} />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={() => deleteHabit.mutate(habitId)}>
          <Trash2Icon size={14} isAnimated={false} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
