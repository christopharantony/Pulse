'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateMilestone } from '@/features/goals/hooks/use-milestone-mutations';

interface MilestoneFormDialogProps {
  goalId: string;
}

/** Inline add-a-milestone form (not a modal — milestones are added frequently enough to stay on-page). */
export function MilestoneFormDialog({ goalId }: MilestoneFormDialogProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const createMilestone = useCreateMilestone();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createMilestone.mutateAsync({
      goalId,
      input: { title: title.trim(), dueDate: dueDate ? new Date(dueDate).toISOString() : null },
    });
    setTitle('');
    setDueDate('');
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <Input
        label="Add a milestone"
        placeholder="e.g. Finish first draft"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1"
      />
      <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <Button type="submit" isLoading={createMilestone.isPending} disabled={!title.trim()}>
        Add
      </Button>
    </form>
  );
}
