'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/feedback/skeleton';

// Lazy-loaded: the dnd-kit bundle shouldn't be paid for by users landing on the Inbox/list views.
const TaskBoard = dynamic(
  () => import('@/features/tasks/components/task-board').then((m) => m.TaskBoard),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);

export default function BoardPage() {
  return <TaskBoard />;
}
