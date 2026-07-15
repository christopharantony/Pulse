import { useQuery } from '@tanstack/react-query';
import { fetchGoalActivity } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useGoalActivity(id: string | null) {
  return useQuery({
    queryKey: goalsKeys.activity(id ?? ''),
    queryFn: () => fetchGoalActivity(id as string),
    enabled: !!id,
  });
}
