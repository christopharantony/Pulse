'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { GoalDetailPanel } from '@/features/goals/components/goal-detail-panel';

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <Card className="mx-auto max-w-2xl">
      <GoalDetailPanel goalId={id} onBack={() => router.push('/goals')} />
    </Card>
  );
}
