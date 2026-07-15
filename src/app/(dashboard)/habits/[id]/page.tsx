'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { HabitDetailPanel } from '@/features/habits/components/habit-detail-panel';

export default function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <Card className="mx-auto max-w-2xl">
      <HabitDetailPanel habitId={id} onBack={() => router.push('/habits')} />
    </Card>
  );
}
