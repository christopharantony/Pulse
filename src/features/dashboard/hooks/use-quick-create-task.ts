import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  quickCreateTaskRequest,
  type QuickCreateTaskInput,
} from '@/features/dashboard/api/dashboard.api';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

/**
 * Quick-create a task from the dashboard. On success it refreshes the overview so the new task
 * appears in Recent Tasks and the "today"/stat tiles update.
 */
export function useQuickCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: QuickCreateTaskInput) => quickCreateTaskRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
