'use client';

import { Trash2Icon } from '@animateicons/react/lucide';
import { ArchiveRestore, Trash } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { useHabitTrash } from '@/features/habits/hooks/use-habit-trash';
import { usePermanentDeleteHabit, useRestoreHabit } from '@/features/habits/hooks/use-delete-habit';

export function HabitTrashList() {
  const { data, isLoading } = useHabitTrash();
  const restoreHabit = useRestoreHabit();
  const permanentDelete = usePermanentDeleteHabit();

  if (isLoading) return <TableSkeleton rows={4} columns={1} />;

  if (!data || data.length === 0) {
    return <EmptyState icon={<Trash />} title="Trash is empty" description="Deleted habits show up here before they're gone for good." />;
  }

  return (
    <ul className="flex flex-col" role="list">
      {data.map((habit) => (
        <li key={habit.id} className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0">
          <span className="min-w-0 flex-1 truncate text-body text-foreground">
            {habit.icon ? `${habit.icon} ` : ''}
            {habit.name}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => restoreHabit.mutate(habit.id)}>
            <ArchiveRestore size={14} />
            Restore
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => permanentDelete.mutate(habit.id)}>
            <Trash2Icon size={14} isAnimated={false} />
            Delete forever
          </Button>
        </li>
      ))}
    </ul>
  );
}
