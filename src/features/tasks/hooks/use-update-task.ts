import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTaskRequest, type UpdateTaskInput } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTaskRequest(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
