import 'server-only';
import { type Filter } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Task } from '@/features/tasks/types/task';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { HabitLog } from '@/features/habits/types/habit-log';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import { sumFocusSeconds } from '@/features/time-tracking/services/time-tracking-summary.service';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { loadActiveHabits } from '@/features/dashboard/services/habits.aggregator';
import { isHabitScheduledOn, habitAnchor } from '@/features/habits/services/habit-schedule';
import { zonedDayKey, zonedDayRange } from '@/lib/time/day';

/**
 * The live "today" numbers, gathered once and shared by the statistics tiles and the productivity
 * score so neither re-queries the database. Every read here is served by a Phase 5 index and is a
 * bounded count or a day-ranged find — never an aggregation over event history (that is the nightly
 * rollup job's job).
 */
export interface TodayMetrics {
  todaysTasks: number;
  completedToday: number;
  overdueTasks: number;
  habitsCompletedToday: number;
  habitsScheduledToday: number;
  focusMinutes: number;
  focusSessions: number;
  /** Highest current streak across active habits — the "Current Streak" tile + score streak signal. */
  topCurrentStreak: number;
}

export async function gatherTodayMetrics(ctx: WorkspaceContext): Promise<TodayMetrics> {
  const now = new Date();
  const { start, end } = zonedDayRange(now, ctx.timezone);
  const todayKey = zonedDayKey(now, ctx.timezone);
  const tasks = await tasksRepository.collection();

  const scope = { workspaceId: ctx.workspaceId, deletedAt: null };

  const [todaysTasks, completedToday, overdueTasks, habitsCompletedToday, habits, sessions] =
    await Promise.all([
      tasks.countDocuments({ ...scope, dueDate: { $gte: start, $lt: end } } as Filter<Task>),
      tasks.countDocuments({ ...scope, completedAt: { $gte: start, $lt: end } } as Filter<Task>),
      tasks.countDocuments({
        ...scope,
        status: { $ne: 'completed' },
        dueDate: { $ne: null, $lt: start },
      } as Filter<Task>),
      habitLogsRepository.count({
        workspaceId: ctx.workspaceId,
        status: 'completed',
        date: todayKey,
      } as Filter<HabitLog>),
      loadActiveHabits(ctx.workspaceId),
      timeSessionRepository.listForUserRange(ctx.workspaceId, ctx.userId, start, end),
    ]);

  const habitsScheduledToday = habits.filter((h) =>
    isHabitScheduledOn(h, todayKey, habitAnchor(h, ctx.timezone))
  ).length;
  const topCurrentStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);

  const focusSeconds = sumFocusSeconds(sessions, now);

  return {
    todaysTasks,
    completedToday,
    overdueTasks,
    habitsCompletedToday,
    habitsScheduledToday,
    focusMinutes: Math.round(focusSeconds / 60),
    focusSessions: sessions.length,
    topCurrentStreak,
  };
}
