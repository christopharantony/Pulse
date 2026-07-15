'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useCreateHabit } from '@/features/habits/hooks/use-create-habit';
import type { CreateHabitInput } from '@/features/habits/api/habits.api';

interface HabitCreateDialogProps {
  trigger: React.ReactNode;
}

export function HabitCreateDialog({ trigger }: HabitCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const createHabit = useCreateHabit();

  async function handleSubmit(input: CreateHabitInput) {
    await createHabit.mutateAsync(input);
    setOpen(false);
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>New habit</ModalTitle>
        </ModalHeader>
        <HabitForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} submitLabel="Create habit" />
      </ModalContent>
    </Modal>
  );
}
