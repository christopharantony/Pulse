import { useQuery } from '@tanstack/react-query';
import { getQuickStartActivitiesRequest } from '@/features/time-tracking/api/time-tracking.api';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useQuickStartActivities() {
  return useQuery({
    queryKey: timeTrackingKeys.quickStart(),
    queryFn: getQuickStartActivitiesRequest,
  });
}
