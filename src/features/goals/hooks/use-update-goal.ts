import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGoalRequest, type UpdateGoalInput } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) => updateGoalRequest(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
      queryClient.invalidateQueries({ queryKey: goalsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
