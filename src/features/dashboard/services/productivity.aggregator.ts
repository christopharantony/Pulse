import 'server-only';
import { analyticsRepository } from '@/features/analytics/repositories/analytics.repository';
import type { AnalyticsDailyRollup } from '@/features/analytics/types/analytics-daily-rollup';
import {
  computeDailyScore,
  median,
  PRODUCTIVE_DAY_THRESHOLD,
} from '@/features/analytics/services/productivity.service';
import type { ProductivityData } from '@/features/dashboard/types/dashboard';
import type { TodayMetrics } from '@/features/dashboard/services/metrics.aggregator';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { addDaysToDayKey, zonedDayKey } from '@/lib/time/day';

const FOCUS_GOAL_MINUTES = 90;
const TREND_DAYS = 7;
const TARGET_WINDOW_DAYS = 30;
const DEFAULT_DAILY_TASK_TARGET = 3;

/** Average of the present values, or 0 when the list is empty. */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Today's productivity score (live) plus trend/deltas read from the historical rollups. Today's
 * score feeds off the shared `TodayMetrics`; history comes from `analytics_daily_rollups`, so this
 * stays fast no matter how much history a user has. The consistency term uses the streak of prior
 * days only (not today), which both matches intuition and avoids a self-referential score.
 */
export async function buildProductivity(
  ctx: WorkspaceContext,
  metrics: TodayMetrics
): Promise<ProductivityData> {
  const todayKey = zonedDayKey(new Date(), ctx.timezone);
  const windowStart = addDaysToDayKey(todayKey, -TARGET_WINDOW_DAYS);
  const yesterday = addDaysToDayKey(todayKey, -1);

  const priorRollups = await analyticsRepository.listForRange(
    ctx.workspaceId,
    ctx.userId,
    windowStart,
    yesterday
  );

  const scoreByDay = new Map<number, number>();
  const completedByDay: number[] = [];
  for (const rollup of priorRollups as AnalyticsDailyRollup[]) {
    scoreByDay.set(rollup.date.getTime(), rollup.metrics.productivityScore ?? 0);
    completedByDay.push(rollup.metrics.tasksCompleted);
  }

  const dailyTaskTarget = completedByDay.length
    ? Math.max(1, Math.round(median(completedByDay)))
    : DEFAULT_DAILY_TASK_TARGET;

  // Streak of consecutive productive days ending yesterday (prior to today's live score).
  let priorProductiveStreak = 0;
  for (let day = yesterday; ; day = addDaysToDayKey(day, -1)) {
    const score = scoreByDay.get(day.getTime());
    if (score == null || score < PRODUCTIVE_DAY_THRESHOLD) break;
    priorProductiveStreak += 1;
    if (day.getTime() <= windowStart.getTime()) break;
  }

  const { score, band, breakdown } = computeDailyScore({
    tasksCompleted: metrics.completedToday,
    dailyTaskTarget,
    habitsCompletedToday: metrics.habitsCompletedToday,
    habitsScheduledToday: metrics.habitsScheduledToday,
    focusMinutes: metrics.focusMinutes,
    focusGoalMinutes: FOCUS_GOAL_MINUTES,
    overdueTasks: metrics.overdueTasks,
    productiveDayStreak: priorProductiveStreak,
    longestActiveHabitStreak: metrics.topCurrentStreak,
  });

  // 7-day sparkline, oldest → newest, today's slot using the freshly computed live score.
  const trend: number[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const day = addDaysToDayKey(todayKey, -i);
    trend.push(i === 0 ? score : (scoreByDay.get(day.getTime()) ?? 0));
  }

  const last7 = priorRollups
    .filter((r) => r.date.getTime() > addDaysToDayKey(todayKey, -TREND_DAYS).getTime())
    .map((r) => r.metrics.productivityScore ?? 0);
  const weeklyDelta = Math.round(score - average(last7));
  const monthlyDelta = Math.round(
    score - average(priorRollups.map((r) => r.metrics.productivityScore ?? 0))
  );

  const productiveDayStreak =
    priorProductiveStreak + (score >= PRODUCTIVE_DAY_THRESHOLD ? 1 : 0);

  return { score, band, breakdown, trend, weeklyDelta, monthlyDelta, productiveDayStreak };
}
