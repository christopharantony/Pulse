'use client';

import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { GoalForm } from '@/features/goals/components/goal-form';
import { useUpdateGoal } from '@/features/goals/hooks/use-update-goal';
import type { GoalDto, CreateGoalInput } from '@/features/goals/api/goals.api';

interface GoalEditDialogProps {
  goal: GoalDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalEditDialog({ goal, open, onOpenChange }: GoalEditDialogProps) {
  const updateGoal = useUpdateGoal();

  async function handleSubmit(input: CreateGoalInput) {
    await updateGoal.mutateAsync({ id: goal.id, input });
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Edit goal</ModalTitle>
        </ModalHeader>
        <GoalForm initial={goal} onSubmit={handleSubmit} onCancel={() => onOpenChange(false)} submitLabel="Save changes" />
      </ModalContent>
    </Modal>
  );
}
