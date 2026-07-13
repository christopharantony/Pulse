'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { TaskList } from '@/features/tasks/components/task-list';

export default function CompletedPage() {
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-4">
      <TaskList
        query={{ status: ['completed'], sortBy: 'completedAt', sortDir: 'desc', limit: 100 }}
        emptyTitle="Nothing completed yet"
        emptyDescription="Tasks you complete will show up here."
        onOpenTask={(id) => router.push(`/tasks/${id}`)}
        onEditTask={(id) => router.push(`/tasks/${id}`)}
      />
    </Card>
  );
}
