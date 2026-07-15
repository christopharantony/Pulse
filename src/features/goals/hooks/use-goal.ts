import { useQuery } from '@tanstack/react-query';
import { fetchGoal } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useGoal(id: string | null) {
  return useQuery({
    queryKey: goalsKeys.detail(id ?? ''),
    queryFn: () => fetchGoal(id as string),
    enabled: !!id,
  });
}
