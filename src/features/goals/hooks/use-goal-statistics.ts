import { useQuery } from '@tanstack/react-query';
import { fetchGoalStatistics, fetchGoalsOverviewStatistics } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useGoalStatistics(id: string | null) {
  return useQuery({
    queryKey: goalsKeys.statistics(id ?? ''),
    queryFn: () => fetchGoalStatistics(id as string),
    enabled: !!id,
  });
}

export function useGoalsOverviewStatistics(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: goalsKeys.overviewStatistics(range),
    queryFn: () => fetchGoalsOverviewStatistics(range),
  });
}
