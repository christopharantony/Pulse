import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startGoalTimerRequest, stopGoalTimerRequest } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useStartGoalTimer() {
  return useMutation({
    mutationFn: ({ goalId, note }: { goalId: string; note?: string | null }) => startGoalTimerRequest(goalId, note),
  });
}

export function useStopGoalTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, sessionId }: { goalId: string; sessionId: string }) => stopGoalTimerRequest(goalId, sessionId),
    onSuccess: (_data, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
    },
  });
}
