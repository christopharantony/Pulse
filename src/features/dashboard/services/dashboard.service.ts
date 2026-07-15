import 'server-only';
import { getUsersCollection } from '@/db/client';
import type { DashboardOverview } from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';
import { gatherTodayMetrics } from '@/features/dashboard/services/metrics.aggregator';
import { buildStatistics } from '@/features/dashboard/services/statistics.aggregator';
import { buildProductivity } from '@/features/dashboard/services/productivity.aggregator';
import { buildHabitSummary } from '@/features/dashboard/services/habits.aggregator';
import { buildRecentTasks } from '@/features/dashboard/services/recent-tasks.aggregator';
import { buildGreeting } from '@/features/dashboard/services/greeting.aggregator';
import { buildCalendarPreview } from '@/features/dashboard/services/calendar.aggregator';
import { buildGoalsSummary } from '@/features/dashboard/services/goals.aggregator';

/** Number of recent tasks embedded in the first-paint overview (more via the sub-endpoint). */
const OVERVIEW_RECENT_TASKS = 5;

export class DashboardError extends AppError {
  constructor(message: string, code: 'USER_NOT_FOUND') {
    super(message, code, 404);
  }
}

/**
 * Assemble the full dashboard overview for the first paint. Sections that don't depend on each other
 * are fanned out with `Promise.all`, so total latency is the slowest single section rather than the
 * sum. The one intra-request dependency is deliberate: statistics and productivity both derive from
 * one shared `TodayMetrics` read so the DB is hit once for "today", not twice.
 */
export async function getOverview(
  ctx: WorkspaceContext,
  opts?: { month?: string }
): Promise<DashboardOverview> {
  const users = await getUsersCollection();
  const [userDoc, metrics, habits, recentTasks, calendar, goals] = await Promise.all([
    users.findOne({ _id: ctx.userId }, { projection: { name: 1 } }),
    gatherTodayMetrics(ctx),
    buildHabitSummary(ctx),
    buildRecentTasks(ctx, { limit: OVERVIEW_RECENT_TASKS }),
    buildCalendarPreview(ctx, opts?.month),
    buildGoalsSummary(ctx),
  ]);

  if (!userDoc) {
    throw new DashboardError('User not found while building dashboard', 'USER_NOT_FOUND');
  }

  // Statistics and productivity both derive from the already-fetched `metrics`; productivity also
  // reads the historical rollups, so it stays async.
  const [statistics, productivity] = [buildStatistics(metrics), await buildProductivity(ctx, metrics)];

  return {
    greeting: buildGreeting(ctx, userDoc.name),
    statistics,
    productivity,
    recentTasks,
    habits,
    goals,
    calendar,
    generatedAt: new Date().toISOString(),
  };
}
