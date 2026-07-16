import { useQuery } from '@tanstack/react-query';
import { getRunningSessionRequest } from '@/features/time-tracking/api/time-tracking.api';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useRunningSession() {
  return useQuery({
    queryKey: timeTrackingKeys.running(),
    queryFn: getRunningSessionRequest,
  });
}
