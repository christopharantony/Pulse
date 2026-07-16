'use client';

import { useDeferredValue, useId, useMemo, useRef, useState } from 'react';
import { PlusIcon } from '@animateicons/react/lucide';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuickStartActivities } from '@/features/time-tracking/hooks/use-quick-start-activities';
import { useStartTimer } from '@/features/time-tracking/hooks/use-start-timer';
import { useSearchGoals } from '@/features/goals/hooks/use-search-goals';
import { useStartGoalTimer } from '@/features/goals/hooks/use-goal-timer';
import { useCreateGoal } from '@/features/goals/hooks/use-create-goal';
import { useSearchHabits } from '@/features/habits/hooks/use-search-habits';
import { useStartHabitTimer } from '@/features/habits/hooks/use-habit-timer';
import { useCreateHabit } from '@/features/habits/hooks/use-create-habit';
import { useSearchTasks } from '@/features/tasks/hooks/use-search-tasks';
import { useStartTaskTimer } from '@/features/tasks/hooks/use-task-timer';
import { useCreateTask } from '@/features/tasks/hooks/use-create-task';

const KIND_DOT_COLOR: Record<string, string> = {
  task: 'bg-accent',
  habit: 'bg-success',
  goal: 'bg-warning',
};

type ComboOption =
  | { key: string; kind: 'recent'; activityId: string; title: string; sourceType: string }
  | { key: string; kind: 'goal'; id: string; title: string }
  | { key: string; kind: 'habit'; id: string; title: string; disabled: boolean; hint?: string }
  | { key: string; kind: 'task'; id: string; title: string }
  | { key: string; kind: 'create-goal' }
  | { key: string; kind: 'create-habit' }
  | { key: string; kind: 'create-task' };

function isSelectable(option: ComboOption): boolean {
  return option.kind !== 'habit' || !option.disabled;
}

/**
 * The merged "what are you working on" input: typing surfaces matching goals/habits/tasks (or
 * Recent activities when empty) in an anchored popover, selectable by click or arrow keys + Enter.
 * Replaces the old separate `StartTimerPicker` modal — one input, one mental model, instead of
 * splitting attention between a prominent free-text field and an easy-to-miss "start on existing…"
 * link. Creating a new goal/habit/task (with its kind) lives in the same popover as "Create as…"
 * pills, reusing the exact create-and-start logic `StartTimerPicker` used.
 *
 * `value`/`onChange` are controlled by the parent (`TimerControl`), which still owns the
 * surrounding `<form>` and its plain "Enter/Play button -> ad-hoc quick-focus timer" fallback —
 * this component only intercepts Enter when a suggestion is actually highlighted.
 */
export function StartTimerCombobox({
  value,
  onChange,
  onActivityStarted,
}: {
  value: string;
  onChange: (value: string) => void;
  onActivityStarted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [creatingKind, setCreatingKind] = useState<'goal' | 'habit' | 'task' | null>(null);
  const [newHabitMinutes, setNewHabitMinutes] = useState('30');
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const deferredQuery = useDeferredValue(value);
  const searching = deferredQuery.trim().length > 0;

  const { data: recentActivities } = useQuickStartActivities();
  const resumeTimer = useStartTimer();

  const { data: goalResults } = useSearchGoals(deferredQuery);
  const startGoalTimer = useStartGoalTimer();
  const createGoal = useCreateGoal();

  const { data: habitResults } = useSearchHabits(deferredQuery);
  const startHabitTimer = useStartHabitTimer();
  const createHabit = useCreateHabit();

  const { data: taskResults } = useSearchTasks(deferredQuery);
  const startTaskTimer = useStartTaskTimer();
  const createTask = useCreateTask();

  function resetAndClose() {
    setCreatingKind(null);
    setNewHabitMinutes('30');
    setHighlightedKey(null);
    setOpen(false);
    onChange('');
    onActivityStarted();
  }

  const options = useMemo<ComboOption[]>(() => {
    if (!searching) {
      return (recentActivities ?? []).map((activity) => ({
        key: `recent:${activity.id}`,
        kind: 'recent' as const,
        activityId: activity.id,
        title: activity.title,
        sourceType: activity.sourceType,
      }));
    }
    const goals: ComboOption[] = (goalResults ?? []).map((g) => ({ key: `goal:${g.id}`, kind: 'goal' as const, id: g.id, title: g.title }));
    const habits: ComboOption[] = (habitResults ?? []).map((h) => ({
      key: `habit:${h.id}`,
      kind: 'habit' as const,
      id: h.id,
      title: h.name,
      disabled: h.type !== 'duration',
      hint: h.type !== 'duration' ? 'Not timeable' : undefined,
    }));
    const tasks: ComboOption[] = (taskResults ?? []).map((t) => ({ key: `task:${t.id}`, kind: 'task' as const, id: t.id, title: t.title }));
    return [
      ...goals,
      ...habits,
      ...tasks,
      { key: 'create-goal', kind: 'create-goal' as const },
      { key: 'create-habit', kind: 'create-habit' as const },
      { key: 'create-task', kind: 'create-task' as const },
    ];
  }, [searching, recentActivities, goalResults, habitResults, taskResults]);

  const navigable = options.filter(isSelectable);

  async function selectOption(option: ComboOption) {
    if (!isSelectable(option)) return;
    if (option.kind === 'recent') {
      await resumeTimer.mutateAsync({ activityId: option.activityId });
      resetAndClose();
      return;
    }
    if (option.kind === 'goal') {
      await startGoalTimer.mutateAsync({ goalId: option.id });
      resetAndClose();
      return;
    }
    if (option.kind === 'habit') {
      await startHabitTimer.mutateAsync({ id: option.id });
      resetAndClose();
      return;
    }
    if (option.kind === 'task') {
      await startTaskTimer.mutateAsync({ taskId: option.id });
      resetAndClose();
      return;
    }
    // Create-pills expand an inline form instead of submitting immediately.
    if (option.kind === 'create-goal') setCreatingKind('goal');
    if (option.kind === 'create-habit') setCreatingKind('habit');
    if (option.kind === 'create-task') setCreatingKind('task');
  }

  async function handleCreateAndStartGoal() {
    const title = value.trim();
    if (!title) return;
    const goal = await createGoal.mutateAsync({ title });
    await startGoalTimer.mutateAsync({ goalId: goal.id });
    resetAndClose();
  }

  async function handleCreateAndStartTask() {
    const title = value.trim();
    if (!title) return;
    const task = await createTask.mutateAsync({ title });
    await startTaskTimer.mutateAsync({ taskId: task.id });
    resetAndClose();
  }

  async function handleCreateAndStartHabit() {
    const name = value.trim();
    const minutes = Number(newHabitMinutes);
    if (!name || !Number.isFinite(minutes) || minutes <= 0) return;
    const habit = await createHabit.mutateAsync({
      name,
      type: 'duration',
      targetValue: minutes,
      recurrence: { frequency: 'daily', interval: 1 },
    });
    await startHabitTimer.mutateAsync({ id: habit.id });
    resetAndClose();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (navigable.length === 0) return;
      const currentIndex = navigable.findIndex((o) => o.key === highlightedKey);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = currentIndex === -1 ? (delta === 1 ? 0 : navigable.length - 1) : (currentIndex + delta + navigable.length) % navigable.length;
      setHighlightedKey(navigable[nextIndex]!.key);
      return;
    }
    if (event.key === 'Enter' && open && highlightedKey) {
      const option = options.find((o) => o.key === highlightedKey);
      if (option) {
        event.preventDefault();
        selectOption(option);
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setHighlightedKey(null);
    }
  }

  const pending =
    resumeTimer.isPending ||
    startGoalTimer.isPending ||
    startHabitTimer.isPending ||
    startTaskTimer.isPending ||
    createGoal.isPending ||
    createHabit.isPending ||
    createTask.isPending;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setHighlightedKey(null);
          setCreatingKind(null);
        }
      }}
    >
      <PopoverAnchor asChild>
        <div className="w-full">
          <Input
            ref={inputRef}
            label="What are you working on?"
            placeholder="e.g. Deep work, Reading"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setHighlightedKey(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="text-center"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={highlightedKey ?? undefined}
            aria-autocomplete="list"
            autoComplete="off"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[min(24rem,90vw)] p-1"
        align="center"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target === inputRef.current) event.preventDefault();
        }}
      >
        <ul id={listboxId} role="listbox" className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {!searching && (recentActivities?.length ?? 0) === 0 && (
            <li className="px-3 py-6 text-center text-small text-muted-foreground">Nothing tracked yet — start typing to search or create.</li>
          )}
          {searching &&
            (goalResults?.length ?? 0) === 0 &&
            (habitResults?.length ?? 0) === 0 &&
            (taskResults?.length ?? 0) === 0 && (
              <li className="px-3 py-2 text-small text-muted-foreground">No matches for &ldquo;{value.trim()}&rdquo;.</li>
            )}
          {options
            .filter((o) => o.kind !== 'create-goal' && o.kind !== 'create-habit' && o.kind !== 'create-task')
            .map((option) => {
              const title = 'title' in option ? option.title : '';
              const dotColor = option.kind === 'recent' ? (KIND_DOT_COLOR[option.sourceType] ?? 'bg-muted-foreground') : KIND_DOT_COLOR[option.kind];
              const disabled = option.kind === 'habit' && option.disabled;
              return (
                <li key={option.key} id={option.key} role="option" aria-selected={highlightedKey === option.key} aria-disabled={disabled}>
                  <button
                    type="button"
                    disabled={disabled || pending}
                    onMouseEnter={() => setHighlightedKey(option.key)}
                    onClick={() => selectOption(option)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors duration-base disabled:cursor-not-allowed disabled:opacity-40',
                      highlightedKey === option.key && 'bg-surface'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {dotColor && <span className={cn('size-2 shrink-0 rounded-full', dotColor)} />}
                      <span className="truncate">{title}</span>
                    </span>
                    {option.kind === 'habit' && option.hint && <span className="text-caption text-muted-foreground">{option.hint}</span>}
                  </button>
                </li>
              );
            })}

          {searching && (
            <li className="mt-1 flex flex-col gap-1 border-t border-border-subtle pt-1">
              {creatingKind ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (creatingKind === 'goal') handleCreateAndStartGoal();
                    if (creatingKind === 'task') handleCreateAndStartTask();
                    if (creatingKind === 'habit') handleCreateAndStartHabit();
                  }}
                  className="flex flex-col gap-2 rounded-md bg-surface/40 p-2"
                >
                  <p className="px-1 text-small text-foreground">
                    Create &ldquo;{value.trim()}&rdquo; as a {creatingKind}
                  </p>
                  {creatingKind === 'habit' && (
                    <Input
                      label="Target minutes"
                      type="number"
                      min={1}
                      autoFocus
                      value={newHabitMinutes}
                      onChange={(e) => setNewHabitMinutes(e.target.value)}
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingKind(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" isLoading={pending}>
                      Create & start
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-1.5 px-1 py-1">
                  {(['task', 'habit', 'goal'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      id={`create-${kind}`}
                      onMouseEnter={() => setHighlightedKey(`create-${kind}`)}
                      onClick={() => setCreatingKind(kind)}
                      className={cn(
                        'flex items-center gap-1 rounded-full border border-border-subtle px-2.5 py-1 text-caption text-muted-foreground transition-colors duration-base hover:border-muted hover:text-foreground',
                        highlightedKey === `create-${kind}` && 'border-muted text-foreground'
                      )}
                    >
                      <PlusIcon size={12} isAnimated={false} />
                      Create as {kind}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
