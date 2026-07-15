'use client';

import { useState } from 'react';
import { ArrowLeft, Flame } from 'lucide-react';
import { CheckIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { CardSkeleton } from '@/components/feedback/skeleton';
import { HabitTypeBadge } from '@/features/habits/components/habit-type-badge';
import { HabitActionsMenu } from '@/features/habits/components/habit-actions-menu';
import { HabitEditDialog } from '@/features/habits/components/habit-edit-dialog';
import { HabitCalendarHeatmap } from '@/features/habits/components/habit-calendar-heatmap';
import { HabitStatisticsCharts } from '@/features/habits/components/habit-statistics-charts';
import { HabitTimerWidget } from '@/features/habits/components/habit-timer-widget';
import { Checkbox } from '@/components/ui/checkbox';
import { useHabit } from '@/features/habits/hooks/use-habit';
import { useCompleteHabit, useLogHabit } from '@/features/habits/hooks/use-log-habit';

interface HabitDetailPanelProps {
  habitId: string;
  onBack?: () => void;
}

export function HabitDetailPanel({ habitId, onBack }: HabitDetailPanelProps) {
  const { data: habit, isLoading, isError } = useHabit(habitId);
  const completeHabit = useCompleteHabit();
  const logHabit = useLogHabit();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <CardSkeleton />;
  if (isError || !habit) {
    return <ErrorState title="Habit not found" description="It may have been deleted or archived." />;
  }

  const done = habit.today.state === 'completed';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {onBack && (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
        )}
        <HabitActionsMenu habitId={habit.id} archived={!!habit.archivedAt} onEdit={() => setEditing(true)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-h1 text-foreground">
            {habit.icon ? `${habit.icon} ` : ''}
            {habit.name}
          </span>
          <HabitTypeBadge type={habit.type} />
        </div>
        {habit.description && <p className="text-small text-muted-foreground">{habit.description}</p>}
        <div className="flex items-center gap-1.5 text-small text-muted-foreground">
          <Flame className="size-4 text-warning" />
          {habit.currentStreak}
          {habit.streakUnit === 'period' ? ' weeks' : ' days'} current streak · {habit.longestStreak}
          {habit.streakUnit === 'period' ? 'w' : 'd'} best
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/40 p-4">
        {habit.type === 'boolean' && (
          <Button type="button" variant={done ? 'secondary' : 'primary'} disabled={done} onClick={() => completeHabit.mutate(habit.id)}>
            <CheckIcon size={16} isAnimated={false} />
            {done ? 'Completed today' : 'Mark complete'}
          </Button>
        )}
        {(habit.type === 'numeric' || habit.type === 'duration') && habit.targetValue && (
          <div className="flex flex-1 items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => logHabit.mutate({ id: habit.id, input: { deltaValue: -1 } })}>
              −
            </Button>
            <span className="text-h3 tabular-nums text-foreground">
              {habit.today.valueToday ?? 0} / {habit.targetValue} {habit.unit}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => logHabit.mutate({ id: habit.id, input: { deltaValue: 1 } })}>
              +
            </Button>
          </div>
        )}
        {habit.type === 'checklist' && habit.checklistItems && (
          <div className="flex flex-1 flex-col gap-2">
            {habit.checklistItems.map((item) => {
              const checked = (habit.today.checkedItemIdsToday ?? []).includes(item.id);
              return (
                <Checkbox
                  key={item.id}
                  label={item.name}
                  checked={checked}
                  onChange={() => {
                    const current = habit.today.checkedItemIdsToday ?? [];
                    const next = checked ? current.filter((id) => id !== item.id) : [...current, item.id];
                    logHabit.mutate({ id: habit.id, input: { checkedItemIds: next } });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {habit.type === 'duration' && <HabitTimerWidget habitId={habit.id} />}

      <HabitCalendarHeatmap habitId={habit.id} />
      <HabitStatisticsCharts habitId={habit.id} />

      <HabitEditDialog habit={habit} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
