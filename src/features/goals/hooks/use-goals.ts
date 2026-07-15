import { useQuery } from '@tanstack/react-query';
import { fetchGoals, type GoalListQuery } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useGoals(query: GoalListQuery = {}) {
  return useQuery({
    queryKey: goalsKeys.list(query),
    queryFn: () => fetchGoals(query),
    staleTime: 30_000,
  });
}
