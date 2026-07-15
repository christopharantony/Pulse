'use client';

import { Flame } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { HabitCard } from '@/features/habits/components/habit-card';
import { useHabits } from '@/features/habits/hooks/use-habits';
import type { HabitListQuery } from '@/features/habits/api/habits.api';
import type { HabitDto } from '@/features/habits/types/habit-dto';

interface HabitListProps {
  query: HabitListQuery;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenHabit?: (id: string) => void;
  onEditHabit?: (id: string) => void;
  /** Client-side post-filter (e.g. Today view narrows to `today.scheduledToday`) — the backend
   * query has no "scheduled today" filter since scheduling is a per-habit derived computation. */
  filterItems?: (items: HabitDto[]) => HabitDto[];
}

/** The one list-rendering component every habit view (Today/All/Archived) uses, parameterized by query. */
export function HabitList({ query, emptyTitle, emptyDescription, onOpenHabit, onEditHabit, filterItems }: HabitListProps) {
  const { data, isLoading, isError, refetch } = useHabits(query);

  if (isLoading) return <TableSkeleton rows={6} columns={1} />;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load habits"
        description="Something went wrong fetching your habits."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const items = filterItems ? filterItems(data?.items ?? []) : (data?.items ?? []);

  if (!data || items.length === 0) {
    return (
      <EmptyState
        icon={<Flame />}
        title={emptyTitle ?? 'No habits here'}
        description={emptyDescription ?? 'Add a habit to start a streak.'}
      />
    );
  }

  return (
    <ul className="flex flex-col" role="list">
      {items.map((habit) => (
        <HabitCard key={habit.id} habit={habit} onOpen={onOpenHabit} onEdit={onEditHabit} />
      ))}
    </ul>
  );
}
