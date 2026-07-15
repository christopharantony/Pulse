import { useQuery } from '@tanstack/react-query';
import { fetchMilestones } from '@/features/goals/api/milestones.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';

export function useMilestones(goalId: string | null) {
  return useQuery({
    queryKey: goalsKeys.milestones(goalId ?? ''),
    queryFn: () => fetchMilestones(goalId as string),
    enabled: !!goalId,
  });
}
