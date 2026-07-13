import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveTaskRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import type { TaskListResult } from '@/features/tasks/api/tasks.api';
import type { TaskStatus } from '@/features/tasks/types/task';

interface MoveTaskArgs {
  id: string;
  status: TaskStatus;
  order: number;
}

/** Optimistic Kanban-column move — same onMutate/onError/onSettled shape as `use-complete-habit.ts`. */
export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, order }: MoveTaskArgs) => moveTaskRequest(id, status, order),
    onMutate: async ({ id, status, order }: MoveTaskArgs) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.lists() });
      const snapshots = queryClient.getQueriesData<TaskListResult>({ queryKey: tasksKeys.lists() });

      for (const [key, result] of snapshots) {
        if (!result) continue;
        queryClient.setQueryData<TaskListResult>(key, {
          ...result,
          items: result.items.map((item) => (item.id === id ? { ...item, status, order } : item)),
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
