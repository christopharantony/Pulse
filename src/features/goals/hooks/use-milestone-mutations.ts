import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  completeMilestoneRequest,
  createMilestoneRequest,
  deleteMilestoneRequest,
  reorderMilestonesRequest,
  updateMilestoneRequest,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
} from '@/features/goals/api/milestones.api';
import { goalsKeys } from '@/features/goals/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidate(queryClient: ReturnType<typeof useQueryClient>, goalId: string) {
  queryClient.invalidateQueries({ queryKey: goalsKeys.milestones(goalId) });
  queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
  queryClient.invalidateQueries({ queryKey: goalsKeys.statistics(goalId) });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, input }: { goalId: string; input: CreateMilestoneInput }) => createMilestoneRequest(goalId, input),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, milestoneId, input }: { goalId: string; milestoneId: string; input: UpdateMilestoneInput }) =>
      updateMilestoneRequest(goalId, milestoneId, input),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => deleteMilestoneRequest(goalId, milestoneId),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useCompleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => completeMilestoneRequest(goalId, milestoneId),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}

export function useReorderMilestones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, orderedIds }: { goalId: string; orderedIds: string[] }) => reorderMilestonesRequest(goalId, orderedIds),
    onSuccess: (_data, { goalId }) => invalidate(queryClient, goalId),
  });
}
