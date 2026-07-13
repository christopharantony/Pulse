'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { TaskList } from '@/features/tasks/components/task-list';

export default function UpcomingPage() {
  const router = useRouter();

  const { dueFrom, dueTo } = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() + 1);
    const to = new Date(from);
    to.setDate(to.getDate() + 30);
    to.setHours(23, 59, 59, 999);
    return { dueFrom: from.toISOString(), dueTo: to.toISOString() };
  }, []);

  return (
    <Card className="flex flex-col gap-4">
      <TaskList
        query={{
          status: ['inbox', 'todo', 'in_progress', 'waiting'],
          hasDueDate: true,
          dueFrom,
          dueTo,
          sortBy: 'dueDate',
          sortDir: 'asc',
          limit: 100,
        }}
        emptyTitle="Nothing coming up"
        emptyDescription="Tasks due in the next 30 days will show up here."
        onOpenTask={(id) => router.push(`/tasks/${id}`)}
        onEditTask={(id) => router.push(`/tasks/${id}`)}
      />
    </Card>
  );
}
