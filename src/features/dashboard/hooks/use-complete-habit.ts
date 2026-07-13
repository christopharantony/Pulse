import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeHabitRequest } from '@/features/dashboard/api/dashboard.api';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';
import type { DashboardOverview } from '@/features/dashboard/types/dashboard';

/**
 * Complete a habit for today with an optimistic update: the habit is checked off and the counts
 * bump instantly in every cached overview, rolling back if the request fails and reconciling with
 * the server's authoritative streak on settle.
 */
export function useCompleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (habitId: string) => completeHabitRequest(habitId),
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.overviewRoot });
      const snapshots = queryClient.getQueriesData<DashboardOverview>({
        queryKey: dashboardKeys.overviewRoot,
      });

      for (const [key, overview] of snapshots) {
        if (!overview) continue;
        const items = overview.habits.items.map((h) =>
          h.id === habitId ? { ...h, completedToday: true, completionPct: Math.max(h.completionPct, 100 / Math.max(1, overview.habits.totalCount)) } : h
        );
        const completedCount = items.filter((h) => h.completedToday).length;
        queryClient.setQueryData<DashboardOverview>(key, {
          ...overview,
          habits: { ...overview.habits, items, completedCount },
        });
      }

      return { snapshots };
    },
    onError: (_error, _habitId, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
