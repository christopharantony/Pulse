import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startTaskTimerRequest, stopTaskTimerRequest } from '@/features/tasks/api/tasks.api';
import { tasksKeys } from '@/features/tasks/hooks/query-keys';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useStartTaskTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string | null }) => startTaskTimerRequest(taskId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

export function useStopTaskTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, sessionId }: { taskId: string; sessionId: string }) => stopTaskTimerRequest(taskId, sessionId),
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}
