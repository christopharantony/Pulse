'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { TaskDetailPanel } from '@/features/tasks/components/task-detail-panel';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <Card className="mx-auto max-w-2xl">
      <TaskDetailPanel taskId={id} onBack={() => router.push('/tasks')} />
    </Card>
  );
}
