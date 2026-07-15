'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import { GoalForm } from '@/features/goals/components/goal-form';
import { useCreateGoal } from '@/features/goals/hooks/use-create-goal';
import type { CreateGoalInput } from '@/features/goals/api/goals.api';

interface GoalCreateDialogProps {
  trigger: React.ReactNode;
}

export function GoalCreateDialog({ trigger }: GoalCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const createGoal = useCreateGoal();

  async function handleSubmit(input: CreateGoalInput) {
    await createGoal.mutateAsync(input);
    setOpen(false);
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>New goal</ModalTitle>
        </ModalHeader>
        <GoalForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} submitLabel="Create goal" />
      </ModalContent>
    </Modal>
  );
}
