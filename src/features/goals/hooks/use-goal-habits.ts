import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGoalHabits,
  linkGoalHabitRequest,
  unlinkGoalHabitRequest,
  updateGoalHabitLinkRequest,
  type GoalHabitContributionType,
} from '@/features/goals/api/goals.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

export function useGoalHabits(goalId: string | null) {
  return useQuery({
    queryKey: goalsKeys.linkedHabits(goalId ?? ''),
    queryFn: () => fetchGoalHabits(goalId as string),
    enabled: !!goalId,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, goalId: string) {
  queryClient.invalidateQueries({ queryKey: goalsKeys.linkedHabits(goalId) });
  queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
  queryClient.invalidateQueries({ queryKey: goalsKeys.statistics(goalId) });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useLinkGoalHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      habitId,
      contributionType,
      contributionWeight,
    }: {
      goalId: string;
      habitId: string;
      contributionType?: GoalHabitContributionType;
      contributionWeight?: number;
    }) => linkGoalHabitRequest(goalId, { habitId, contributionType, contributionWeight }),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useUnlinkGoalHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, habitId }: { goalId: string; habitId: string }) => unlinkGoalHabitRequest(goalId, habitId),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useUpdateGoalHabitLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      habitId,
      contributionType,
      contributionWeight,
    }: {
      goalId: string;
      habitId: string;
      contributionType?: GoalHabitContributionType;
      contributionWeight?: number;
    }) => updateGoalHabitLinkRequest(goalId, habitId, { contributionType, contributionWeight }),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}
