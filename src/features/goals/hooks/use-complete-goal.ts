import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeGoalRequest, updateGoalStatusRequest, type GoalStatus } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: goalsKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useCompleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeGoalRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateGoalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: GoalStatus }) => updateGoalStatusRequest(id, status),
    onSuccess: () => invalidateAll(queryClient),
  });
}
