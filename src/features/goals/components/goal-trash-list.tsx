'use client';

import { Trash2Icon } from '@animateicons/react/lucide';
import { ArchiveRestore, Trash } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { useGoalTrash } from '@/features/goals/hooks/use-goal-trash';
import { usePermanentDeleteGoal, useRestoreGoal } from '@/features/goals/hooks/use-delete-goal';

export function GoalTrashList() {
  const { data, isLoading } = useGoalTrash();
  const restoreGoal = useRestoreGoal();
  const permanentDelete = usePermanentDeleteGoal();

  if (isLoading) return <TableSkeleton rows={4} columns={1} />;

  if (!data || data.length === 0) {
    return <EmptyState icon={<Trash />} title="Trash is empty" description="Deleted goals show up here before they're gone for good." />;
  }

  return (
    <ul className="flex flex-col" role="list">
      {data.map((goal) => (
        <li key={goal.id} className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0">
          <span className="min-w-0 flex-1 truncate text-body text-foreground">
            {goal.icon ? `${goal.icon} ` : ''}
            {goal.title}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => restoreGoal.mutate(goal.id)}>
            <ArchiveRestore size={14} />
            Restore
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => permanentDelete.mutate(goal.id)}>
            <Trash2Icon size={14} isAnimated={false} />
            Delete forever
          </Button>
        </li>
      ))}
    </ul>
  );
}
