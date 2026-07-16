import { useMutation, useQueryClient } from '@tanstack/react-query';
import { stopTimerRequest } from '@/features/time-tracking/api/time-tracking.api';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useStopTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, note }: { sessionId: string; note?: string | null }) => stopTimerRequest(sessionId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
