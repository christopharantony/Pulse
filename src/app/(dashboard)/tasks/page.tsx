'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@animateicons/react/lucide';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskQuickAdd } from '@/features/tasks/components/task-quick-add';
import { TaskList } from '@/features/tasks/components/task-list';
import { TaskCreateDialog } from '@/features/tasks/components/task-create-dialog';
import { TaskFiltersBar, type TaskFilters } from '@/features/tasks/components/task-filters-bar';

export default function InboxPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<TaskFilters>({ status: [], priority: [], tagIds: [] });

  return (
    <Card className="flex flex-col gap-4">
      {/* Inline quick-add on desktop; a floating action button replaces it on mobile (below). */}
      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex-1">
          <TaskQuickAdd defaultStatus="inbox" />
        </div>
        <TaskCreateDialog
          defaultStatus="inbox"
          trigger={
            <Button type="button" variant="ghost" size="icon" aria-label="New task (full form)">
              <PlusIcon size={16} isAnimated={false} />
            </Button>
          }
        />
      </div>

      <TaskCreateDialog
        defaultStatus="inbox"
        trigger={
          <Button
            type="button"
            size="icon"
            aria-label="New task"
            className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-glow sm:hidden"
          >
            <PlusIcon size={22} isAnimated={false} />
          </Button>
        }
      />
      <TaskFiltersBar value={filters} onChange={setFilters} />
      <TaskList
        query={{
          status: filters.status.length ? filters.status : ['inbox'],
          priority: filters.priority.length ? filters.priority : undefined,
          tagIds: filters.tagIds.length ? filters.tagIds : undefined,
          sortBy: 'order',
          sortDir: 'asc',
          limit: 50,
        }}
        emptyTitle="Inbox zero"
        emptyDescription="Capture anything here — sort it into a project or schedule later."
        onOpenTask={(id) => router.push(`/tasks/${id}`)}
        onEditTask={(id) => router.push(`/tasks/${id}`)}
        selectable
      />
    </Card>
  );
}
