'use client';

import { useState } from 'react';
import { ListTodo } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { TaskRow } from '@/features/tasks/components/task-row';
import { BulkActionsToolbar } from '@/features/tasks/components/bulk-actions-toolbar';
import { useTasks } from '@/features/tasks/hooks/use-tasks';
import type { TaskListQuery } from '@/features/tasks/api/tasks.api';

interface TaskListProps {
  query: TaskListQuery;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenTask?: (id: string) => void;
  onEditTask?: (id: string) => void;
  /** Enables multi-select checkboxes and a bulk-actions toolbar above the list. */
  selectable?: boolean;
}

/**
 * The one list-rendering component every task view (Inbox/Today/Upcoming/Completed/Archived) uses,
 * parameterized by the `TaskListQuery` filter it's called with rather than duplicated per view.
 */
export function TaskList({
  query,
  emptyTitle,
  emptyDescription,
  onOpenTask,
  onEditTask,
  selectable,
}: TaskListProps) {
  const { data, isLoading, isError, refetch } = useTasks(query);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (isLoading) return <TableSkeleton rows={6} columns={1} />;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load tasks"
        description="Something went wrong fetching your tasks."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<ListTodo />}
        title={emptyTitle ?? 'No tasks here'}
        description={emptyDescription ?? 'Create a task to get started.'}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {selectable && <BulkActionsToolbar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />}
      <ul className="flex flex-col" role="list">
        {data.items.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onOpen={onOpenTask}
            onEdit={onEditTask}
            selected={selectable ? selectedIds.includes(task.id) : undefined}
            onToggleSelect={selectable ? toggleSelect : undefined}
          />
        ))}
      </ul>
    </div>
  );
}
