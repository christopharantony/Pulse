'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateGoalProgress } from '@/features/goals/hooks/use-goal-progress';
import type { GoalDto } from '@/features/goals/api/goals.api';

interface GoalManualProgressProps {
  goal: GoalDto;
}

/** Manual progress editor — shown for the `manual` progress method, where nothing else recomputes `currentValue`. */
export function GoalManualProgress({ goal }: GoalManualProgressProps) {
  const [value, setValue] = useState(goal.currentValue);
  const updateProgress = useUpdateGoalProgress();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (goal.targetValue) {
      updateProgress.mutate({ id: goal.id, input: { currentValue: value } });
    } else {
      updateProgress.mutate({ id: goal.id, input: { progressPct: Math.min(100, Math.max(0, value)) } });
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <Input
        label={goal.targetValue ? `Current value (of ${goal.targetValue})` : 'Progress %'}
        type="number"
        min={0}
        max={goal.targetValue ?? 100}
        step="any"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <Button type="submit" size="sm" isLoading={updateProgress.isPending}>
        Update
      </Button>
    </form>
  );
}
