import { useQuery } from '@tanstack/react-query';
import { getHistoryRequest } from '@/features/time-tracking/api/time-tracking.api';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useHistory(days = 10) {
  return useQuery({
    queryKey: timeTrackingKeys.history(days),
    queryFn: () => getHistoryRequest(days),
  });
}
