import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startHabitTimerRequest, stopHabitTimerRequest } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';
import { timeTrackingKeys } from '@/features/time-tracking/hooks/query-keys';

export function useStartHabitTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string | null }) => startHabitTimerRequest(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}

export function useStopHabitTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessionId }: { id: string; sessionId: string }) => stopHabitTimerRequest(id, sessionId),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: habitsKeys.calendarRoot(id) });
      queryClient.invalidateQueries({ queryKey: habitsKeys.statistics(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
      queryClient.invalidateQueries({ queryKey: timeTrackingKeys.all });
    },
  });
}
