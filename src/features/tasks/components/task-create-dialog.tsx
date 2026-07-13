'use client';

import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import { TaskForm } from '@/features/tasks/components/task-form';
import { useCreateTask } from '@/features/tasks/hooks/use-create-task';
import type { CreateTaskInput } from '@/features/tasks/api/tasks.api';

interface TaskCreateDialogProps {
  trigger: React.ReactNode;
  defaultStatus?: CreateTaskInput['status'];
}

export function TaskCreateDialog({ trigger, defaultStatus }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateTask();

  async function handleSubmit(input: CreateTaskInput) {
    await createTask.mutateAsync({ ...input, status: input.status ?? defaultStatus });
    setOpen(false);
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>{trigger}</ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>New task</ModalTitle>
        </ModalHeader>
        <TaskForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} submitLabel="Create task" />
      </ModalContent>
    </Modal>
  );
}
