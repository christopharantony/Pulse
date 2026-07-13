import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTaskRequest, restoreTaskRequest, permanentDeleteTaskRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: tasksKeys.all });
  queryClient.invalidateQueries({ queryKey: tasksKeys.trash });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTaskRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreTaskRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function usePermanentDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permanentDeleteTaskRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
