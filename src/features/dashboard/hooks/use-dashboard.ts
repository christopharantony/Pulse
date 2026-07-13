import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '@/features/dashboard/api/dashboard.api';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

/**
 * The dashboard overview. A short `staleTime` (the numbers are "today"-fresh but tolerate a few
 * seconds of staleness, per the design) plus refetch-on-focus so returning to the tab feels live.
 */
export function useDashboard(month?: string) {
  return useQuery({
    queryKey: dashboardKeys.overview(month),
    queryFn: () => fetchDashboard(month),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}
