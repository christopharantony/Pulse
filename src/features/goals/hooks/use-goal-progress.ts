import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGoalProgressRequest } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { currentValue?: number; progressPct?: number } }) =>
      updateGoalProgressRequest(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
      queryClient.invalidateQueries({ queryKey: goalsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
