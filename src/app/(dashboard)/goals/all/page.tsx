'use client';

import { useRouter } from 'next/navigation';
import { PlusIcon } from '@animateicons/react/lucide';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalCreateDialog } from '@/features/goals/components/goal-create-dialog';
import { GoalList } from '@/features/goals/components/goal-list';

export default function AllGoalsPage() {
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 text-foreground">All goals</h1>
        <GoalCreateDialog
          trigger={
            <Button type="button" variant="ghost" size="icon" aria-label="New goal">
              <PlusIcon size={16} isAnimated={false} />
            </Button>
          }
        />
      </div>
      <GoalList
        query={{ includeArchived: false, limit: 100, sortBy: 'createdAt', sortDir: 'desc' }}
        emptyTitle="No goals yet"
        emptyDescription="Set your first goal to give your work direction."
        onOpenGoal={(id) => router.push(`/goals/${id}`)}
      />
    </Card>
  );
}
