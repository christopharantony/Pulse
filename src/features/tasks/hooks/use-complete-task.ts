import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeTaskRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';
import type { TaskListResult } from '@/features/tasks/api/tasks.api';

/** Optimistic checkbox toggle — follows `use-complete-habit.ts`'s onMutate/onError/onSettled shape. */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completeTaskRequest(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.lists() });
      const snapshots = queryClient.getQueriesData<TaskListResult>({ queryKey: tasksKeys.lists() });

      for (const [key, result] of snapshots) {
        if (!result) continue;
        queryClient.setQueryData<TaskListResult>(key, {
          ...result,
          items: result.items.map((item) =>
            item.id === id ? { ...item, status: 'completed', completedAt: new Date().toISOString() } : item
          ),
        });
      }

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
