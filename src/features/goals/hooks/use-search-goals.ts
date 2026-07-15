import { useQuery } from '@tanstack/react-query';
import { searchGoalsRequest } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useSearchGoals(q: string) {
  return useQuery({
    queryKey: goalsKeys.search(q),
    queryFn: () => searchGoalsRequest(q),
    enabled: q.trim().length > 0,
  });
}
