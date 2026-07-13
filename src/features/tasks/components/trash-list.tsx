'use client';

import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { fetchTrash } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import { usePermanentDeleteTask, useRestoreTask } from '@/features/tasks/hooks/use-delete-task';

export function TrashList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: tasksKeys.trash,
    queryFn: fetchTrash,
  });
  const restoreTask = useRestoreTask();
  const permanentDeleteTask = usePermanentDeleteTask();

  if (isLoading) return <TableSkeleton rows={6} columns={1} />;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load trash"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<Trash2 />}
        title="Trash is empty"
        description="Deleted tasks show up here and can be restored or permanently removed."
      />
    );
  }

  return (
    <ul className="flex flex-col" role="list">
      {data.map((task) => (
        <li
          key={task.id}
          className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0"
        >
          <span className="min-w-0 flex-1 truncate text-body text-muted-foreground line-through">
            {task.title}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => restoreTask.mutate(task.id)}>
            <RotateCcw size={14} />
            Restore
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) {
                permanentDeleteTask.mutate(task.id);
              }
            }}
          >
            <Trash2 size={14} />
            Delete forever
          </Button>
        </li>
      ))}
    </ul>
  );
}
