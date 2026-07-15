import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  completeHabitRequest,
  logHabitRequest,
  undoHabitLogRequest,
  type LogHabitInput,
} from '@/features/habits/api/habits.api';
import type { HabitListResult } from '@/features/habits/api/habits.api';
import { habitsKeys } from '@/features/habits/hooks/query-keys';
import { dashboardKeys } from '@/features/dashboard/hooks/query-keys';

/**
 * Optimistically mark a habit's `today` context satisfied — a light local approximation; the
 * server's authoritative streak/progress values land on settle via invalidation. Only safe for
 * boolean habits, where "logged" and "completed" are the same thing: a numeric/duration/checklist
 * log might only be a partial contribution (e.g. one of several "+1" taps toward a target), so
 * guessing "completed" here would flash an incorrect checkmark until the real response lands.
 */
function optimisticMarkDone(result: HabitListResult, id: string): HabitListResult {
  return {
    ...result,
    items: result.items.map((item) =>
      item.id === id && item.type === 'boolean'
        ? { ...item, today: { ...item.today, state: 'completed', progressToday: 100 } }
        : item
    ),
  };
}

/**
 * Log a day for a habit (any type). Follows `use-complete-task.ts`/the dashboard's
 * `use-complete-habit.ts` onMutate/onError/onSettled shape for the optimistic list update.
 */
export function useLogHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: LogHabitInput }) => logHabitRequest(id, input),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.lists() });
      const snapshots = queryClient.getQueriesData<HabitListResult>({ queryKey: habitsKeys.lists() });
      for (const [key, result] of snapshots) {
        if (!result) continue;
        queryClient.setQueryData<HabitListResult>(key, optimisticMarkDone(result, id));
      }
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: habitsKeys.calendarRoot(id) });
      queryClient.invalidateQueries({ queryKey: habitsKeys.statistics(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}

/** Quick-complete a boolean habit for today — the one-click "make it easy" action. */
export function useCompleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => completeHabitRequest(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.lists() });
      const snapshots = queryClient.getQueriesData<HabitListResult>({ queryKey: habitsKeys.lists() });
      for (const [key, result] of snapshots) {
        if (!result) continue;
        queryClient.setQueryData<HabitListResult>(key, optimisticMarkDone(result, id));
      }
      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}

export function useUndoHabitLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => undoHabitLogRequest(id, date),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overviewRoot });
    },
  });
}
