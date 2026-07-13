'use client';

import { useState } from 'react';
import { Check, Flame } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { cn } from '@/lib/utils';
import type { HabitSummaryData } from '@/features/dashboard/types/dashboard';
import { useCompleteHabit } from '@/features/dashboard/hooks/use-complete-habit';
import { ConfettiBurst } from '@/features/dashboard/components/confetti-burst';

export function TodaysHabitsCard({ habits }: { habits: HabitSummaryData }) {
  const completeHabit = useCompleteHabit();
  const [burst, setBurst] = useState<{ id: number; origin: { x: number; y: number } } | null>(null);

  const handleComplete = (habitId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setBurst({ id: Date.now(), origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } });
    completeHabit.mutate(habitId);
  };

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="flex-row items-center justify-between pb-0">
        <div className="flex flex-col gap-1">
          <CardTitle>Today’s Habits</CardTitle>
          {habits.totalCount > 0 && (
            <CardDescription>
              {habits.completedCount} of {habits.totalCount} complete
            </CardDescription>
          )}
        </div>
      </CardHeader>

      {habits.items.length === 0 ? (
        <EmptyState
          icon={<Flame />}
          title="No habits scheduled today"
          description="Build a routine — add a habit to start a streak."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.items.map((habit) => (
            <li
              key={habit.id}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/40 p-3"
            >
              <button
                type="button"
                disabled={habit.completedToday}
                onClick={(e) => handleComplete(habit.id, e)}
                aria-label={habit.completedToday ? `${habit.name} completed` : `Complete ${habit.name}`}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                  habit.completedToday
                    ? 'border-success bg-success/15 text-success'
                    : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
                )}
              >
                <Check className="size-4" />
              </button>

              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    'truncate text-body',
                    habit.completedToday ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}
                >
                  {habit.name}
                </span>
                <span className="text-caption text-muted-foreground">{habit.frequencyLabel}</span>
              </div>

              <span className="flex items-center gap-1 text-small text-muted-foreground">
                <Flame className="size-3.5 text-warning" />
                {habit.currentStreak}
              </span>
            </li>
          ))}
        </ul>
      )}

      {burst && <ConfettiBurst key={burst.id} origin={burst.origin} />}
    </Card>
  );
}
