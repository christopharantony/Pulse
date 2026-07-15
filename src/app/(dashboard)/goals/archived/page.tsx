'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { GoalList } from '@/features/goals/components/goal-list';

export default function ArchivedGoalsPage() {
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-h2 text-foreground">Archived</h1>
      <GoalList
        query={{ status: ['archived'], includeArchived: true, limit: 100, sortBy: 'updatedAt', sortDir: 'desc' }}
        emptyTitle="No archived goals"
        emptyDescription="Goals you archive show up here, fully restorable."
        onOpenGoal={(id) => router.push(`/goals/${id}`)}
      />
    </Card>
  );
}
