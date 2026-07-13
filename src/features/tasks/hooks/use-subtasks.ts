import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addSubtaskRequest,
  removeSubtaskRequest,
  reorderSubtasksRequest,
  updateSubtaskRequest,
} from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

function invalidate(queryClient: ReturnType<typeof useQueryClient>, taskId: string) {
  queryClient.invalidateQueries({ queryKey: tasksKeys.detail(taskId) });
  queryClient.invalidateQueries({ queryKey: tasksKeys.lists() });
}

export function useAddSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, parentSubtaskId }: { title: string; parentSubtaskId?: string | null }) =>
      addSubtaskRequest(taskId, title, parentSubtaskId),
    onSuccess: () => invalidate(queryClient, taskId),
  });
}

export function useUpdateSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subtaskId,
      patch,
    }: {
      subtaskId: string;
      patch: { title?: string; completed?: boolean; order?: number };
    }) => updateSubtaskRequest(taskId, subtaskId, patch),
    onSuccess: () => invalidate(queryClient, taskId),
  });
}

export function useRemoveSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId: string) => removeSubtaskRequest(taskId, subtaskId),
    onSuccess: () => invalidate(queryClient, taskId),
  });
}

export function useReorderSubtasks(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds, parentSubtaskId }: { orderedIds: string[]; parentSubtaskId?: string | null }) =>
      reorderSubtasksRequest(taskId, orderedIds, parentSubtaskId),
    onSuccess: () => invalidate(queryClient, taskId),
  });
}
