import { useQuery } from '@tanstack/react-query';
import { fetchGoalTrash } from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useGoalTrash() {
  return useQuery({
    queryKey: goalsKeys.trash,
    queryFn: () => fetchGoalTrash(),
  });
}
