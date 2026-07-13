import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bulkArchiveTasksRequest,
  bulkDeleteTasksRequest,
  bulkUpdateTasksRequest,
} from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      patch,
    }: {
      ids: string[];
      patch: { status?: string; priority?: string; projectId?: string | null; tagIds?: string[] };
    }) => bulkUpdateTasksRequest(ids, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTasksRequest(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}

export function useBulkArchiveTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkArchiveTasksRequest(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
  });
}
