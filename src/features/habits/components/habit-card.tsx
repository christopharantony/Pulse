'use client';

import { memo } from 'react';
import { CheckIcon, PlusIcon } from '@animateicons/react/lucide';
import { Flame, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompleteHabit, useLogHabit } from '@/features/habits/hooks/use-log-habit';
import { HabitActionsMenu } from '@/features/habits/components/habit-actions-menu';
import type { HabitDto } from '@/features/habits/types/habit-dto';

interface HabitCardProps {
  habit: HabitDto;
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function HabitCardImpl({ habit, onOpen, onEdit }: HabitCardProps) {
  const completeHabit = useCompleteHabit();
  const logHabit = useLogHabit();
  const done = habit.today.state === 'completed';

  return (
    <li
      className="group flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0 hover:bg-surface-elevated/50"
      role="listitem"
    >
      <QuickAction habit={habit} onComplete={() => completeHabit.mutate(habit.id)} onIncrement={(delta) => logHabit.mutate({ id: habit.id, input: { deltaValue: delta } })} />

      <button
        type="button"
        onClick={() => onOpen?.(habit.id)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className={cn('truncate text-body', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
          {habit.icon ? `${habit.icon} ` : ''}
          {habit.name}
        </span>
        <span className="text-caption text-muted-foreground">
          {habit.category ? `${habit.category} · ` : ''}
          {(habit.type === 'numeric' || habit.type === 'duration') && habit.targetValue
            ? `${habit.today.valueToday ?? 0}/${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ''}`
            : habit.type === 'checklist' && habit.checklistItems
              ? `${habit.today.checkedItemIdsToday?.length ?? 0}/${habit.checklistItems.length} items`
              : null}
        </span>
      </button>

      <span className="flex items-center gap-1 text-small text-muted-foreground">
        <Flame className="size-3.5 text-warning" />
        {habit.currentStreak}
        {habit.streakUnit === 'period' ? 'w' : ''}
      </span>

      <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <HabitActionsMenu habitId={habit.id} archived={!!habit.archivedAt} onEdit={onEdit ? () => onEdit(habit.id) : undefined} />
      </div>
    </li>
  );
}

function QuickAction({
  habit,
  onComplete,
  onIncrement,
}: {
  habit: HabitDto;
  onComplete: () => void;
  onIncrement: (delta: number) => void;
}) {
  const done = habit.today.state === 'completed';

  if (habit.type === 'checklist') {
    return <ChecklistQuickAction habit={habit} />;
  }

  if (habit.type === 'numeric' || habit.type === 'duration') {
    return (
      <button
        type="button"
        aria-label={`Add one ${habit.unit ?? 'unit'} to ${habit.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onIncrement(habit.type === 'duration' ? 5 : 1);
        }}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
          done ? 'border-success bg-success/15 text-success' : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
        )}
      >
        {done ? <CheckIcon size={14} isAnimated={false} /> : habit.type === 'duration' ? <Timer size={14} /> : <PlusIcon size={14} isAnimated={false} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={done}
      aria-label={done ? `${habit.name} completed` : `Complete ${habit.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onComplete();
      }}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors',
        done ? 'border-success bg-success/15 text-success' : 'border-border text-muted-foreground hover:border-accent hover:text-accent'
      )}
    >
      <CheckIcon size={14} isAnimated={false} />
    </button>
  );
}

function ChecklistQuickAction({ habit }: { habit: HabitDto }) {
  const logHabit = useLogHabit();
  const checked = habit.today.checkedItemIdsToday ?? [];
  const total = habit.checklistItems?.length ?? 0;
  const done = habit.today.state === 'completed';

  function toggle(itemId: string) {
    const next = checked.includes(itemId) ? checked.filter((id) => id !== itemId) : [...checked, itemId];
    logHabit.mutate({ id: habit.id, input: { checkedItemIds: next } });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`${habit.name} checklist, ${checked.length} of ${total} done`}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors',
            done ? 'border-success bg-success/15 text-success' : 'border-border text-muted-foreground hover:border-accent'
          )}
        >
          {done ? <CheckIcon size={14} isAnimated={false} /> : `${checked.length}/${total}`}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-2">
          {(habit.checklistItems ?? []).map((item) => (
            <Checkbox
              key={item.id}
              label={item.name}
              checked={checked.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const HabitCard = memo(HabitCardImpl, (prev, next) => prev.habit === next.habit);
