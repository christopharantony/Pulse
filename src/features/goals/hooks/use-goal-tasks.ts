import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachGoalTaskRequest, detachGoalTaskRequest, fetchGoalTasks } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useGoalTasks(goalId: string | null) {
  return useQuery({
    queryKey: goalsKeys.linkedTasks(goalId ?? ''),
    queryFn: () => fetchGoalTasks(goalId as string),
    enabled: !!goalId,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, goalId: string) {
  queryClient.invalidateQueries({ queryKey: goalsKeys.linkedTasks(goalId) });
  queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
  queryClient.invalidateQueries({ queryKey: goalsKeys.statistics(goalId) });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useAttachGoalTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, taskId }: { goalId: string; taskId: string }) => attachGoalTaskRequest(goalId, taskId),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useDetachGoalTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, taskId }: { goalId: string; taskId: string }) => detachGoalTaskRequest(goalId, taskId),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}
