import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGoalRequest, type CreateGoalInput } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoalRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
