import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveTaskRequest, unarchiveTaskRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useArchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveTaskRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

export function useUnarchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) => unarchiveTaskRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
