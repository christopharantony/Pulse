import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderTaskRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import type { TaskListResult } from '@/features/tasks/api/tasks.api';

interface ReorderTaskArgs {
  id: string;
  order: number;
}

/** Optimistic single-column reorder — same shape as `use-move-task.ts`. */
export function useReorderTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, order }: ReorderTaskArgs) => reorderTaskRequest(id, order),
    onMutate: async ({ id, order }: ReorderTaskArgs) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.lists() });
      const snapshots = queryClient.getQueriesData<TaskListResult>({ queryKey: tasksKeys.lists() });

      for (const [key, result] of snapshots) {
        if (!result) continue;
        queryClient.setQueryData<TaskListResult>(key, {
          ...result,
          items: result.items
            .map((item) => (item.id === id ? { ...item, order } : item))
            .sort((a, b) => a.order - b.order),
        });
      }

      return { snapshots };
    },
    onError: (_error, _args, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
