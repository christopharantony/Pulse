import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteHabitRequest,
  permanentDeleteHabitRequest,
  restoreHabitRequest,
} from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: habitsKeys.all });
  queryClient.invalidateQueries({ queryKey: habitsKeys.trash });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHabitRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestoreHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreHabitRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function usePermanentDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permanentDeleteHabitRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
