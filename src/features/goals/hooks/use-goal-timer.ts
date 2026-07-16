import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startGoalTimerRequest, stopGoalTimerRequest } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useStartGoalTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, note }: { goalId: string; note?: string | null }) => startGoalTimerRequest(goalId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

export function useStopGoalTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, sessionId }: { goalId: string; sessionId: string }) => stopGoalTimerRequest(goalId, sessionId),
    onSuccess: (_data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}
