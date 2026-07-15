'use client';

import { useDeferredValue, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchHabits } from '@/features/habits/hooks/use-search-habits';
import { useLinkGoalHabit } from '@/features/goals/hooks/use-goal-habits';
import type { GoalHabitContributionType } from '@/features/goals/api/goals.api';

interface GoalHabitLinkDialogProps {
  goalId: string;
  trigger: React.ReactNode;
}

export function GoalHabitLinkDialog({ goalId, trigger }: GoalHabitLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const { data: results = [] } = useSearchHabits(deferredQuery);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [contributionType, setContributionType] = useState<GoalHabitContributionType>('count');
  const [contributionWeight, setContributionWeight] = useState(1);
  const linkHabit = useLinkGoalHabit();

  async function submit() {
    if (!selectedHabitId) return;
    await linkHabit.mutateAsync({ goalId, habitId: selectedHabitId, contributionType, contributionWeight });
    setOpen(false);
    setQuery('');
    setSelectedHabitId(null);
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Link a habit</ModalTitle>
        </ModalHeader>
        <div className="flex flex-col gap-4">
          <SearchInput
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedHabitId(null);
            }}
            onClear={() => setQuery('')}
            placeholder="Search habits…"
            aria-label="Search habits to link"
          />
          {query.trim().length > 0 && !selectedHabitId && (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
              {results.map((habit) => (
                <li key={habit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHabitId(habit.id);
                      setQuery(habit.name);
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-surface"
                  >
                    {habit.name}
                  </button>
                </li>
              ))}
              {results.length === 0 && <p className="p-3 text-caption text-muted-foreground">No matching habits.</p>}
            </ul>
          )}

          {selectedHabitId && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-label text-muted-foreground">Contribution type</label>
                <Select value={contributionType} onValueChange={(v) => setContributionType(v as GoalHabitContributionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Each completed day counts</SelectItem>
                    <SelectItem value="value">Logged value counts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Contribution weight"
                type="number"
                min={0}
                step="any"
                value={contributionWeight}
                onChange={(e) => setContributionWeight(Number(e.target.value))}
              />
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!selectedHabitId} isLoading={linkHabit.isPending} onClick={submit}>
              Link habit
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
