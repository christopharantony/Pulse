import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startTimerRequest, type StartTimerInput } from '@/features/time-tracking/api/time-tracking.api';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useStartTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartTimerInput) => startTimerRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
