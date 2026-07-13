'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { TaskList } from '@/features/tasks/components/task-list';

export default function ArchivedPage() {
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-4">
      <TaskList
        query={{ status: ['archived'], includeArchived: true, sortBy: 'updatedAt', sortDir: 'desc', limit: 100 }}
        emptyTitle="No archived tasks"
        emptyDescription="Archive a task from its menu to hide it from active views without deleting it."
        onOpenTask={(id) => router.push(`/tasks/${id}`)}
        onEditTask={(id) => router.push(`/tasks/${id}`)}
        selectable
      />
    </Card>
  );
}
