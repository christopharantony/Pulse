'use client';

import { useState } from 'react';
import { ListTodo } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { cn } from '@/lib/utils';
import type { RecentTaskItem, RecentTasksData } from '@/features/dashboard/types/dashboard';
import { fetchRecentTasks } from '@/features/dashboard/api/dashboard.api';

const PRIORITY_DOT: Record<RecentTaskItem['priority'], string> = {
  urgent: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-accent',
  low: 'bg-muted',
  none: 'bg-transparent',
};

const STATUS_LABEL: Record<RecentTaskItem['status'], string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

function formatDue(dueDate: string | null, done: boolean): { text: string; overdue: boolean } | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const overdue = !done && due.getTime() < Date.now();
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overdue,
  };
}

export function RecentTasksCard({ initial }: { initial: RecentTasksData }) {
  const [items, setItems] = useState<RecentTaskItem[]>(initial.items);
  const [nextOffset, setNextOffset] = useState<number | null>(initial.nextOffset);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (nextOffset == null) return;
    setLoading(true);
    try {
      const page = await fetchRecentTasks(nextOffset, 10);
      setItems((prev) => [...prev, ...page.items]);
      setNextOffset(page.nextOffset);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-0">
        <CardTitle>Recent Tasks</CardTitle>
      </CardHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={<ListTodo />}
          title="No tasks yet"
          description="Create your first task to see it here."
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border-subtle">
            {items.map((task) => {
              const due = formatDue(task.dueDate, task.status === 'done');
              return (
                <li key={task.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden
                    className={cn('size-2 shrink-0 rounded-full', PRIORITY_DOT[task.priority])}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        'truncate text-body',
                        task.status === 'done'
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="flex items-center gap-2 text-caption text-muted-foreground">
                      <span>{STATUS_LABEL[task.status]}</span>
                      {task.project && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{task.project.name}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {due && (
                    <span
                      className={cn(
                        'shrink-0 text-caption',
                        due.overdue ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {due.text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {nextOffset != null && (
            <Button variant="ghost" size="sm" onClick={loadMore} isLoading={loading} className="self-center">
              Load more
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
