'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { TaskList } from '@/features/tasks/components/task-list';

export default function TodayPage() {
  const router = useRouter();

  // No dueFrom — an upper bound of "end of today" naturally includes anything overdue too.
  const dueTo = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }, []);

  return (
    <Card className="flex flex-col gap-4">
      <TaskList
        query={{
          status: ['inbox', 'todo', 'in_progress', 'waiting'],
          hasDueDate: true,
          dueTo,
          sortBy: 'dueDate',
          sortDir: 'asc',
          limit: 100,
        }}
        emptyTitle="Nothing due today"
        emptyDescription="Tasks due today or overdue will show up here."
        onOpenTask={(id) => router.push(`/tasks/${id}`)}
        onEditTask={(id) => router.push(`/tasks/${id}`)}
      />
    </Card>
  );
}
