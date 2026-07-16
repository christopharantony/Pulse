import { useQuery } from '@tanstack/react-query';
import { getTodaySummaryRequest } from '@/features/time-tracking/api/time-tracking.api';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useTodaySummary() {
  return useQuery({
    queryKey: timeTrackingKeys.today(),
    queryFn: getTodaySummaryRequest,
  });
}
