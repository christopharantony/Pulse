import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTaskRequest, type CreateTaskInput } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTaskRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
