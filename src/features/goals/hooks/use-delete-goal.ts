import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteGoalRequest,
  permanentDeleteGoalRequest,
  restoreGoalRequest,
} from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: goalsKeys.all });
  queryClient.invalidateQueries({ queryKey: goalsKeys.trash });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGoalRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestoreGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreGoalRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function usePermanentDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permanentDeleteGoalRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
