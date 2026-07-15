'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { HabitList } from '@/features/habits/components/habit-list';

export default function ArchivedHabitsPage() {
  const router = useRouter();

  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-h2 text-foreground">Archived</h1>
      <HabitList
        query={{ includeArchived: true, limit: 100, sortBy: 'name', sortDir: 'asc' }}
        filterItems={(items) => items.filter((h) => h.archivedAt !== null)}
        emptyTitle="No archived habits"
        emptyDescription="Habits you archive show up here, fully restorable."
        onOpenHabit={(id) => router.push(`/habits/${id}`)}
      />
    </Card>
  );
}
