import 'server-only';
import { type ObjectId } from 'mongodb';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';
import { zonedDayKey } from '@/lib/time/day';

export interface HabitCompletionResult {
  completedToday: boolean;
  currentStreak: number;
}

/**
 * Mark a habit complete for today (workspace timezone). Idempotent — the `{habitId, date}` unique
 * index means completing twice in a day updates the same log rather than double-counting — then
 * recomputes the denormalized streak cache from the log history (never trusting a client value).
 */
export async function completeHabitToday(
  ctx: WorkspaceContext,
  habitId: ObjectId
): Promise<HabitCompletionResult> {
  const habit = await habitsRepository.findById(habitId);
  if (!habit || !habit.workspaceId.equals(ctx.workspaceId)) {
    throw new AppError('Habit not found', 'HABIT_NOT_FOUND', 404);
  }

  await habitLogsRepository.upsertForDay({
    workspaceId: ctx.workspaceId,
    habitId,
    userId: ctx.userId,
    date: zonedDayKey(new Date(), ctx.timezone),
    status: 'completed',
  });

  const updated = await habitsRepository.recomputeStreakCache(habitId);
  return { completedToday: true, currentStreak: updated?.currentStreak ?? habit.currentStreak };
}
