import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { analyticsRepository } from '@/features/analytics/repositories/analytics.repository';
import type { DailyMetrics } from '@/features/analytics/types/analytics-daily-rollup';
import {
  computeDailyScore,
  median,
  PRODUCTIVE_DAY_THRESHOLD,
} from '@/features/analytics/services/productivity.service';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Task } from '@/features/tasks/types/task';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import type { HabitLog } from '@/features/habits/types/habit-log';
import { timeSessionRepository } from '@/features/time-tracking/repositories/time-session.repository';
import { workspaceMemberRepository } from '@/features/workspace/repositories/workspace-member.repository';
import { workspaceRepository } from '@/features/workspace/repositories/workspace.repository';
import type { Workspace } from '@/features/workspace/types/workspace';
import type { WorkspaceMember } from '@/features/workspace/types/workspace-member';
import { loadActiveHabits } from '@/features/dashboard/services/habits.aggregator';
import { isScheduledOn } from '@/lib/time/recurrence';
import { addDaysToDayKey, zonedDayKey, zonedDayParts, zonedDayRange } from '@/lib/time/day';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const FOCUS_GOAL_MINUTES = 90;
const TARGET_WINDOW_DAYS = 30;
const DEFAULT_DAILY_TASK_TARGET = 3;

/**
 * Compute and persist the analytics rollup for one user/day. Reads the raw event data for a *closed*
 * day and derives the same `DailyMetrics` + score the live path would, then upserts idempotently on
 * `{workspaceId, userId, date}` — safe to re-run for a day without duplicating. Intended to run
 * nightly for "yesterday"; today stays live so a missing rollup never affects today's numbers.
 */
export async function rollupDay(input: {
  workspaceId: ObjectId;
  userId: ObjectId;
  timezone: string;
  /** Any instant within the target day (its tz-local calendar day is what gets rolled up). */
  dayInstant: Date;
}): Promise<void> {
  const { workspaceId, userId, timezone, dayInstant } = input;
  const { start, end } = zonedDayRange(dayInstant, timezone);
  const dayKey = zonedDayKey(dayInstant, timezone);
  const tasks = await tasksRepository.collection();
  const scope = { workspaceId, deletedAt: null };

  const [tasksCompleted, overdueTasks, habitsCompleted, sessions, habits, priorRollups] =
    await Promise.all([
      tasks.countDocuments({ ...scope, completedAt: { $gte: start, $lt: end } } as Filter<Task>),
      tasks.countDocuments({
        ...scope,
        status: { $ne: 'done' },
        dueDate: { $ne: null, $lt: end },
      } as Filter<Task>),
      habitLogsRepository.count({
        workspaceId,
        status: 'completed',
        date: dayKey,
      } as Filter<HabitLog>),
      timeSessionRepository.listForUserRange(workspaceId, userId, start, end),
      loadActiveHabits(workspaceId),
      analyticsRepository.listForRange(
        workspaceId,
        userId,
        addDaysToDayKey(dayKey, -TARGET_WINDOW_DAYS),
        addDaysToDayKey(dayKey, -1)
      ),
    ]);

  const trackedSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const habitsScheduled = habits.filter((h) =>
    isScheduledOn(h.recurrence, dayKey, zonedDayParts(h.createdAt, timezone))
  ).length;
  const topStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);

  const completedHistory = priorRollups.map((r) => r.metrics.tasksCompleted);
  const dailyTaskTarget = completedHistory.length
    ? Math.max(1, Math.round(median(completedHistory)))
    : DEFAULT_DAILY_TASK_TARGET;

  let priorStreak = 0;
  const scoreByDay = new Map(
    priorRollups.map((r) => [r.date.getTime(), r.metrics.productivityScore ?? 0])
  );
  for (let day = addDaysToDayKey(dayKey, -1); ; day = addDaysToDayKey(day, -1)) {
    const s = scoreByDay.get(day.getTime());
    if (s == null || s < PRODUCTIVE_DAY_THRESHOLD) break;
    priorStreak += 1;
    if (day.getTime() <= addDaysToDayKey(dayKey, -TARGET_WINDOW_DAYS).getTime()) break;
  }

  const { score } = computeDailyScore({
    tasksCompleted,
    dailyTaskTarget,
    habitsCompletedToday: habitsCompleted,
    habitsScheduledToday: habitsScheduled,
    focusMinutes: Math.round(trackedSeconds / 60),
    focusGoalMinutes: FOCUS_GOAL_MINUTES,
    overdueTasks,
    productiveDayStreak: priorStreak,
    longestActiveHabitStreak: topStreak,
  });

  const metrics: DailyMetrics = {
    trackedSeconds,
    tasksCompleted,
    habitsCompleted,
    focusSessions: sessions.length,
    overdueTasks,
    productivityScore: score,
  };

  await analyticsRepository.upsertForDay({ workspaceId, userId, date: dayKey, metrics });
}

/**
 * Roll up *yesterday* for every workspace member, using each member's workspace timezone. Intended
 * to be invoked once nightly by the internal cron route. A full scan of memberships is fine at MVP
 * scale; when it isn't, shard by workspace or drive it incrementally on session-stop instead.
 */
export async function runRollupsForYesterday(): Promise<{ processed: number }> {
  const membersCollection = await workspaceMemberRepository.collection();
  const members = (await membersCollection.find({}).toArray()) as WorkspaceMember[];

  const workspaceCache = new Map<string, Workspace | null>();
  const yesterday = new Date(Date.now() - MS_PER_DAY);
  let processed = 0;

  for (const member of members) {
    const wsKey = member.workspaceId.toHexString();
    let workspace = workspaceCache.get(wsKey);
    if (workspace === undefined) {
      workspace = await workspaceRepository.findById(member.workspaceId);
      workspaceCache.set(wsKey, workspace);
    }
    if (!workspace) continue;

    await rollupDay({
      workspaceId: member.workspaceId,
      userId: member.userId,
      timezone: workspace.settings.timezone,
      dayInstant: yesterday,
    });
    processed += 1;
  }

  return { processed };
}
