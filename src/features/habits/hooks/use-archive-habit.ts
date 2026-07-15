import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveHabitRequest, unarchiveHabitRequest } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: habitsKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveHabitRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUnarchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unarchiveHabitRequest(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
