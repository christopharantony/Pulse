'use client';

import { Link2Off } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { Flame } from 'lucide-react';
import { useGoalHabits, useUnlinkGoalHabit } from '@/features/goals/hooks/use-goal-habits';
import { useHabit } from '@/features/habits/hooks/use-habit';
import type { GoalHabitLinkDto } from '@/features/goals/api/goals.api';

interface GoalLinkedHabitsProps {
  goalId: string;
}

export function GoalLinkedHabits({ goalId }: GoalLinkedHabitsProps) {
  const { data: links, isLoading } = useGoalHabits(goalId);

  if (isLoading) return <TableSkeleton rows={3} columns={1} />;

  if (!links || links.length === 0) {
    return <EmptyState icon={<Flame />} title="No habits linked" description="Link a daily habit that contributes toward this goal." />;
  }

  return (
    <ul className="flex flex-col" role="list">
      {links.map((link) => (
        <LinkedHabitRow key={link.id} goalId={goalId} link={link} />
      ))}
    </ul>
  );
}

function LinkedHabitRow({ goalId, link }: { goalId: string; link: GoalHabitLinkDto }) {
  const { data: habit } = useHabit(link.habitId);
  const unlinkHabit = useUnlinkGoalHabit();

  return (
    <li className="flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0">
      <span className="min-w-0 flex-1 truncate text-body text-foreground">
        {habit ? `${habit.icon ? `${habit.icon} ` : ''}${habit.name}` : 'Loading…'}
      </span>
      <span className="text-caption text-muted-foreground">
        {link.contributionType === 'count' ? 'per day' : 'per value'} × {link.contributionWeight}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Unlink ${habit?.name ?? 'habit'}`}
        onClick={() => unlinkHabit.mutate({ goalId, habitId: link.habitId })}
      >
        <Link2Off size={14} />
      </Button>
    </li>
  );
}
