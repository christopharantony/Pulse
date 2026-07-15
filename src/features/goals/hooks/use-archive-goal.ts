import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveGoalRequest, unarchiveGoalRequest } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: goalsKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveGoalRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUnarchiveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unarchiveGoalRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
