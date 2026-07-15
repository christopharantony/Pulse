'use client';

import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { HabitForm } from '@/features/habits/components/habit-form';
import { useUpdateHabit } from '@/features/habits/hooks/use-update-habit';
import type { HabitDto } from '@/features/habits/types/habit-dto';
import type { CreateHabitInput } from '@/features/habits/api/habits.api';

interface HabitEditDialogProps {
  habit: HabitDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitEditDialog({ habit, open, onOpenChange }: HabitEditDialogProps) {
  const updateHabit = useUpdateHabit();

  async function handleSubmit(input: CreateHabitInput) {
    const { type: _type, ...patch } = input;
    await updateHabit.mutateAsync({ id: habit.id, input: patch });
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Edit habit</ModalTitle>
        </ModalHeader>
        <HabitForm
          initial={habit}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save changes"
        />
      </ModalContent>
    </Modal>
  );
}
