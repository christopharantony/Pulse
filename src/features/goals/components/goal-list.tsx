'use client';

import { Target } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { GoalCard } from '@/features/goals/components/goal-card';
import { useGoals } from '@/features/goals/hooks/use-goals';
import type { GoalListQuery, GoalDto } from '@/features/goals/api/goals.api';

interface GoalListProps {
  query: GoalListQuery;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenGoal?: (id: string) => void;
  onEditGoal?: (id: string) => void;
  filterItems?: (items: GoalDto[]) => GoalDto[];
}

/** The one list-rendering component every goal view (Active/All/Archived) uses, parameterized by query. */
export function GoalList({ query, emptyTitle, emptyDescription, onOpenGoal, onEditGoal, filterItems }: GoalListProps) {
  const { data, isLoading, isError, refetch } = useGoals(query);

  if (isLoading) return <TableSkeleton rows={6} columns={1} />;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load goals"
        description="Something went wrong fetching your goals."
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
        icon={<Target />}
        title={emptyTitle ?? 'No goals yet'}
        description={emptyDescription ?? 'Set a goal to give your work direction.'}
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
      {items.map((goal) => (
        <GoalCard key={goal.id} goal={goal} onOpen={onOpenGoal} onEdit={onEditGoal} />
      ))}
    </ul>
  );
}
