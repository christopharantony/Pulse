import { useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicateTaskRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';

export function useDuplicateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateTaskRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
