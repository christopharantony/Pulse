'use client';

import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { TaskForm } from '@/features/tasks/components/task-form';
import { useTask } from '@/features/tasks/hooks/use-task';
import { useUpdateTask } from '@/features/tasks/hooks/use-update-task';
import type { CreateTaskInput } from '@/features/tasks/api/tasks.api';

interface TaskEditDialogProps {
  taskId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function TaskEditDialog({ taskId, onOpenChange }: TaskEditDialogProps) {
  const { data: task } = useTask(taskId);
  const updateTask = useUpdateTask();

  async function handleSubmit(input: CreateTaskInput) {
    if (!taskId) return;
    await updateTask.mutateAsync({ id: taskId, input });
    onOpenChange(false);
  }

  return (
    <Modal open={!!taskId} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Edit task</ModalTitle>
        </ModalHeader>
        {task && (
          <TaskForm
            initial={task}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            submitLabel="Save changes"
          />
        )}
      </ModalContent>
    </Modal>
  );
}
