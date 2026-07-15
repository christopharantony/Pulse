'use client';

import { useRouter } from 'next/navigation';
import { PlusIcon } from '@animateicons/react/lucide';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HabitCreateDialog } from '@/features/habits/components/habit-create-dialog';
import { HabitList } from '@/features/habits/components/habit-list';

export default function TodaysHabitsPage() {
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 text-foreground">Today</h1>
        <HabitCreateDialog
          trigger={
            <Button type="button" variant="ghost" size="icon" aria-label="New habit">
              <PlusIcon size={16} isAnimated={false} />
            </Button>
          }
        />
      </div>
      <HabitList
        query={{ includeArchived: false, limit: 100, sortBy: 'name', sortDir: 'asc' }}
        filterItems={(items) => items.filter((h) => h.today.scheduledToday)}
        emptyTitle="No habits scheduled today"
        emptyDescription="Build a routine — add a habit to start a streak."
        onOpenHabit={(id) => router.push(`/habits/${id}`)}
      />
    </Card>
  );
}
