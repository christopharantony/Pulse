import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';
import { goalProgressSnapshotsRepository } from '@/features/goals/repositories/goal-progress-snapshots.repository';
import { computeProgressPct } from '@/features/goals/services/goals.service';
import type { Goal } from '@/features/goals/types/goal';
import type { GoalsSummaryData, GoalSummaryItem, UpcomingMilestoneItem } from '@/features/dashboard/types/dashboard';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AT_RISK_WINDOW_DAYS = 14;
const UPCOMING_MILESTONE_DAYS = 14;
const RECENT_LIMIT = 5;
const DEADLINE_LIMIT = 5;

/**
 * All live, non-archived/cancelled goals in a workspace. Exported so other aggregators (e.g. a
 * future statistics tile) reuse the same "active goal" definition instead of re-deriving it —
 * mirrors `loadActiveHabits`.
 */
export async function loadActiveGoals(workspaceId: ObjectId): Promise<Goal[]> {
  const collection = await goalsRepository.collection();
  return collection
    .find({ workspaceId, deletedAt: null, status: { $nin: ['archived', 'cancelled'] } } as Filter<Goal>)
    .toArray() as Promise<Goal[]>;
}

function toSummaryItem(goal: Goal): GoalSummaryItem {
  return {
    id: goal._id.toHexString(),
    title: goal.title,
    category: goal.category,
    priority: goal.priority,
    status: goal.status,
    progressPct: computeProgressPct(goal),
    targetDate: goal.targetDate?.toISOString() ?? null,
    color: goal.color,
    icon: goal.icon,
    updatedAt: goal.updatedAt.toISOString(),
  };
}

/**
 * The Goals dashboard section: Active/Completed counts, an average Progress Ring value, Upcoming
 * Milestones, Goal Deadlines, Recently Updated Goals, and Goals at Risk. Every list is capped and
 * derived from one workspace-wide goal read plus two small cross-collection queries (milestones,
 * at-risk snapshot ids) — never N+1 per-goal.
 */
export async function buildGoalsSummary(ctx: WorkspaceContext): Promise<GoalsSummaryData> {
  const goals = await loadActiveGoals(ctx.workspaceId);
  const activeGoals = goals.filter((g) => g.status !== 'completed');

  const completedCount = await goalsRepository.count({
    workspaceId: ctx.workspaceId,
    deletedAt: null,
    status: 'completed',
  } as Filter<Goal>);

  const averageProgressPct = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, g) => sum + computeProgressPct(g), 0) / activeGoals.length)
    : 0;

  const goalDeadlines = [...activeGoals]
    .filter((g) => g.targetDate)
    .sort((a, b) => a.targetDate!.getTime() - b.targetDate!.getTime())
    .slice(0, DEADLINE_LIMIT)
    .map(toSummaryItem);

  const recentlyUpdated = [...goals]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, RECENT_LIMIT)
    .map(toSummaryItem);

  const now = new Date();
  const [upcomingMilestonesRaw, atRiskIds] = await Promise.all([
    milestonesRepository.listUpcoming(ctx.workspaceId, {
      from: now,
      to: new Date(now.getTime() + UPCOMING_MILESTONE_DAYS * MS_PER_DAY),
    }),
    goalProgressSnapshotsRepository.listAtRiskGoalIds(ctx.workspaceId, new Date(now.getTime() - AT_RISK_WINDOW_DAYS * MS_PER_DAY)),
  ]);

  const goalById = new Map(goals.map((g) => [g._id.toHexString(), g]));
  const upcomingMilestones: UpcomingMilestoneItem[] = upcomingMilestonesRaw.map((m) => ({
    id: m._id.toHexString(),
    goalId: m.goalId.toHexString(),
    goalTitle: goalById.get(m.goalId.toHexString())?.title ?? 'Unknown goal',
    title: m.title,
    dueDate: m.dueDate?.toISOString() ?? null,
  }));

  const atRiskIdSet = new Set(atRiskIds.map((id) => id.toHexString()));
  const atRisk = activeGoals.filter((g) => atRiskIdSet.has(g._id.toHexString())).map(toSummaryItem);

  return {
    activeCount: activeGoals.length,
    completedCount,
    averageProgressPct,
    upcomingMilestones,
    goalDeadlines,
    recentlyUpdated,
    atRisk,
  };
}
