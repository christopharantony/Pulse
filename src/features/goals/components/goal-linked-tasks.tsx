'use client';

import { useDeferredValue, useState } from 'react';
import { Link2Off } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { useGoalTasks, useAttachGoalTask, useDetachGoalTask } from '@/features/goals/hooks/use-goal-tasks';
import { useSearchTasks } from '@/features/tasks/hooks/use-search-tasks';

interface GoalLinkedTasksProps {
  goalId: string;
}

export function GoalLinkedTasks({ goalId }: GoalLinkedTasksProps) {
  const { data, isLoading } = useGoalTasks(goalId);
  const attachTask = useAttachGoalTask();
  const detachTask = useDetachGoalTask();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { data: searchResults = [] } = useSearchTasks(deferredQuery);

  const linkedIds = new Set((data?.items ?? []).map((t) => t.id));
  const pickable = searchResults.filter((t) => !linkedIds.has(t.id));

  return (
    <div className="flex flex-col gap-4">
      {data && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Total" value={data.counts.total} />
          <Stat label="Done" value={data.counts.completed} />
          <Stat label="Overdue" value={data.counts.overdue} />
          <Stat label="Remaining" value={data.counts.remaining} />
        </div>
      )}

      <div className="relative">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder="Attach a task…"
          aria-label="Search tasks to attach"
        />
        {query.trim().length > 0 && pickable.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-popover mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-surface-elevated p-1 shadow-glow">
            {pickable.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  attachTask.mutate({ goalId, taskId: task.id });
                  setQuery('');
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-surface"
              >
                <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && <TableSkeleton rows={3} columns={1} />}

      {!isLoading && (!data || data.items.length === 0) && (
        <EmptyState title="No tasks linked" description="Attach tasks that contribute to this goal." />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <ul className="flex flex-col" role="list">
          {data.items.map((task) => (
            <li key={task.id} className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 truncate text-body text-foreground">{task.title}</span>
              <span className="text-caption text-muted-foreground">{task.status}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Detach ${task.title}`}
                onClick={() => detachTask.mutate({ goalId, taskId: task.id })}
              >
                <Link2Off size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface/40 py-2">
      <div className="text-h3 tabular-nums text-foreground">{value}</div>
      <div className="text-caption text-muted-foreground">{label}</div>
    </div>
  );
}
