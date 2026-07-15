import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';
import { goalProgressSnapshotsRepository } from '@/features/goals/repositories/goal-progress-snapshots.repository';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { Task } from '@/features/tasks/types/task';
import { getOwnedGoal, computeProgressPct } from '@/features/goals/services/goals.service';
import { sumHabitContribution } from '@/features/goals/services/goal-progress.service';
import type { Goal } from '@/features/goals/types/goal';
import type { GoalsOverviewStatisticsDto, GoalStatisticsDto } from '@/features/goals/types/goal-statistics-dto';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getGoalStatistics(ctx: WorkspaceContext, goalId: ObjectId): Promise<GoalStatisticsDto> {
  const goal = await getOwnedGoal(ctx, goalId, { includeDeleted: true });
  const [milestoneCounts, taskCounts, habitContribution] = await Promise.all([
    milestonesRepository.countByGoal(goalId),
    tasksRepository.countByGoal(ctx.workspaceId, goalId),
    sumHabitContribution(goal),
  ]);

  const now = new Date();
  const start = goal.startDate ?? goal.createdAt;
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY));
  const daysRemaining = goal.targetDate ? Math.ceil((goal.targetDate.getTime() - now.getTime()) / MS_PER_DAY) : null;

  let onTrack: boolean | null = null;
  if (goal.targetDate && goal.startDate) {
    const totalDays = Math.max(1, Math.ceil((goal.targetDate.getTime() - goal.startDate.getTime()) / MS_PER_DAY));
    const expectedPct = Math.min(100, (daysElapsed / totalDays) * 100);
    onTrack = computeProgressPct(goal) >= expectedPct;
  }

  return {
    progressPct: computeProgressPct(goal),
    milestonesCompleted: milestoneCounts.completed,
    milestonesTotal: milestoneCounts.total,
    tasksCompleted: taskCounts.completed,
    tasksOverdue: taskCounts.overdue,
    tasksRemaining: taskCounts.remaining,
    tasksTotal: taskCounts.total,
    habitContribution,
    daysElapsed,
    daysRemaining,
    onTrack,
  };
}

/**
 * Workspace-wide goal statistics. Scans every non-deleted goal in the workspace (bounded, matching
 * `rollup.service.ts`'s own "fine at MVP scale" trade-off for full-workspace aggregates) rather
 * than a bespoke aggregation pipeline per metric, since most of these numbers need per-goal date
 * arithmetic that doesn't reduce cleanly to a single Mongo `$group`.
 */
export async function getGoalsOverviewStatistics(
  ctx: WorkspaceContext,
  range?: { from?: Date; to?: Date }
): Promise<GoalsOverviewStatisticsDto> {
  const collection = await goalsRepository.collection();
  const filter: Filter<Goal> = { workspaceId: ctx.workspaceId, deletedAt: null } as Filter<Goal>;
  if (range?.from || range?.to) {
    (filter as Record<string, unknown>).createdAt = {
      ...(range.from ? { $gte: range.from } : {}),
      ...(range.to ? { $lte: range.to } : {}),
    };
  }
  const goals = (await collection.find(filter).toArray()) as Goal[];

  const completedGoals = goals.filter((g) => g.status === 'completed');
  const cancelledGoals = goals.filter((g) => g.status === 'cancelled');
  const activeGoals = goals.filter((g) => g.status === 'active' || g.status === 'on_hold' || g.status === 'not_started');

  const completionRate =
    completedGoals.length + cancelledGoals.length > 0
      ? Math.round((completedGoals.length / (completedGoals.length + cancelledGoals.length)) * 100)
      : 0;

  const durations = completedGoals
    .filter((g) => g.completionDate)
    .map((g) => (g.completionDate!.getTime() - (g.startDate ?? g.createdAt).getTime()) / MS_PER_DAY);
  const averageDurationDays = durations.length
    ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    : null;

  const completedWithTarget = completedGoals.filter((g) => g.targetDate);
  const onTimeGoals = completedWithTarget.filter((g) => g.completionDate!.getTime() <= g.targetDate!.getTime());
  const onTimePct = completedWithTarget.length ? Math.round((onTimeGoals.length / completedWithTarget.length) * 100) : 0;

  const overdueActive = activeGoals.filter((g) => g.targetDate && g.targetDate.getTime() < Date.now());
  const overduePct = activeGoals.length ? Math.round((overdueActive.length / activeGoals.length) * 100) : 0;

  let mostProductiveGoal: GoalsOverviewStatisticsDto['mostProductiveGoal'] = null;
  for (const goal of completedGoals) {
    const [taskCounts, habitContribution] = await Promise.all([
      tasksRepository.countByGoal(ctx.workspaceId, goal._id),
      sumHabitContribution(goal),
    ]);
    const score = taskCounts.completed + habitContribution;
    if (!mostProductiveGoal || score > mostProductiveGoal.score) {
      mostProductiveGoal = { id: goal._id.toHexString(), title: goal.title, score };
    }
  }

  let longestRunningGoal: GoalsOverviewStatisticsDto['longestRunningGoal'] = null;
  for (const goal of activeGoals) {
    const start = goal.startDate ?? goal.createdAt;
    const days = Math.floor((Date.now() - start.getTime()) / MS_PER_DAY);
    if (!longestRunningGoal || days > longestRunningGoal.days) {
      longestRunningGoal = { id: goal._id.toHexString(), title: goal.title, days };
    }
  }

  const milestoneAgg = await milestonesRepository.countByWorkspace(ctx.workspaceId);
  const milestoneCompletionRate = milestoneAgg.total ? Math.round((milestoneAgg.completed / milestoneAgg.total) * 100) : 0;

  const tasksCollection = await tasksRepository.collection();
  const [goalTasksCompleted, goalTasksTotal] = await Promise.all([
    tasksCollection.countDocuments({
      workspaceId: ctx.workspaceId,
      goalId: { $ne: null },
      deletedAt: null,
      status: 'completed',
    } as Filter<Task>),
    tasksCollection.countDocuments({ workspaceId: ctx.workspaceId, goalId: { $ne: null }, deletedAt: null } as Filter<Task>),
  ]);
  const taskCompletionRate = goalTasksTotal ? Math.round((goalTasksCompleted / goalTasksTotal) * 100) : 0;

  const yearAgo = new Date(Date.now() - 365 * MS_PER_DAY);
  const snapshots = await goalProgressSnapshotsRepository.listForWorkspaceRange(ctx.workspaceId, yearAgo, new Date());
  const byMonth = new Map<string, number[]>();
  for (const snap of snapshots) {
    const month = `${snap.date.getUTCFullYear()}-${String(snap.date.getUTCMonth() + 1).padStart(2, '0')}`;
    const bucket = byMonth.get(month) ?? [];
    bucket.push(snap.progressPct);
    byMonth.set(month, bucket);
  }
  const monthlyProgress = [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, pcts]) => ({
      month,
      averagePct: Math.round(pcts.reduce((sum, pct) => sum + pct, 0) / pcts.length),
    }));

  return {
    goalsCreated: goals.length,
    goalsCompleted: completedGoals.length,
    completionRate,
    averageDurationDays,
    onTimePct,
    overduePct,
    mostProductiveGoal,
    longestRunningGoal,
    milestoneCompletionRate,
    taskCompletionRate,
    monthlyProgress,
  };
}
