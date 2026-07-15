import 'server-only';
import type { ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';
import { goalHabitLinksRepository } from '@/features/goals/repositories/goal-habit-links.repository';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import { habitsRepository } from '@/features/habits/repositories/habits.repository';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';
import { isDaySatisfied } from '@/features/habits/services/habit-schedule';
import { recordGoalActivity } from '@/features/goals/services/goal-activity.service';
import type { Goal } from '@/features/goals/types/goal';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';

/**
 * Sum of contributions from every habit linked to a goal, since the goal's `startDate` (or its
 * creation date when unset) through today. `count` contribution weights each satisfied day;
 * `value` contribution weights the day's logged numeric/duration quantity — see
 * `GoalHabitContributionType`. Exported so `goal-habits.service.ts` can reuse it for the detail
 * page's per-habit contribution display without duplicating the computation.
 */
export async function sumHabitContribution(goal: Goal): Promise<number> {
  const links = await goalHabitLinksRepository.listByGoal(goal._id);
  if (links.length === 0) return 0;

  const from = goal.startDate ?? goal.createdAt;
  const to = new Date();
  let total = 0;
  for (const link of links) {
    const habit = await habitsRepository.findById(link.habitId);
    if (!habit) continue;
    const logs = await habitLogsRepository.listForRange(link.habitId, from, to);
    if (link.contributionType === 'count') {
      total += logs.filter((log) => isDaySatisfied(habit, log)).length * link.contributionWeight;
    } else {
      total += logs.reduce((sum, log) => sum + (log.value ?? 0), 0) * link.contributionWeight;
    }
  }
  return total;
}

/**
 * Dispatches progress computation by `goal.progressMethod`. Queries the source repositories
 * directly rather than the sibling goal-tasks/goal-habits *service* modules — those modules call
 * `recomputeGoalProgress`, so importing them back here would cycle.
 */
async function computeGoalProgress(ctx: WorkspaceContext, goal: Goal): Promise<{ currentValue: number } | null> {
  switch (goal.progressMethod) {
    case 'milestone': {
      const { completed, total } = await milestonesRepository.countByGoal(goal._id);
      if (total === 0) return null;
      return { currentValue: Math.round((completed / total) * 100) };
    }
    case 'task': {
      const { completed, total } = await tasksRepository.countByGoal(goal.workspaceId, goal._id);
      if (total === 0) return null;
      return { currentValue: Math.round((completed / total) * 100) };
    }
    case 'habit': {
      const links = await goalHabitLinksRepository.listByGoal(goal._id);
      if (links.length === 0) return null;
      return { currentValue: await sumHabitContribution(goal) };
    }
    case 'mixed': {
      const parts: number[] = [];
      const { completed: mCompleted, total: mTotal } = await milestonesRepository.countByGoal(goal._id);
      if (mTotal > 0) parts.push((mCompleted / mTotal) * 100);

      const { completed: tCompleted, total: tTotal } = await tasksRepository.countByGoal(goal.workspaceId, goal._id);
      if (tTotal > 0) parts.push((tCompleted / tTotal) * 100);

      const links = await goalHabitLinksRepository.listByGoal(goal._id);
      if (links.length > 0 && goal.targetValue && goal.targetValue > 0) {
        const contribution = await sumHabitContribution(goal);
        parts.push(Math.min(100, (contribution / goal.targetValue) * 100));
      }

      if (parts.length === 0) return null;
      return { currentValue: Math.round(parts.reduce((sum, part) => sum + part, 0) / parts.length) };
    }
    default:
      return null;
  }
}

/**
 * Recompute and persist a goal's progress. Call this after any event that could move the needle:
 * milestone completion, (later) task/habit changes, or a `progressMethod` switch. No-op when the
 * method has nothing to compute yet (e.g. `milestone` with zero milestones defined).
 */
export async function recomputeGoalProgress(ctx: WorkspaceContext, goalId: ObjectId): Promise<Goal | null> {
  const goal = await goalsRepository.findById(goalId);
  if (!goal) return null;
  const result = await computeGoalProgress(ctx, goal);
  if (!result || result.currentValue === goal.currentValue) return goal;
  const updated = await goalsRepository.setProgress(goalId, result);
  await recordGoalActivity(ctx, goalId, 'progress_updated', String(goal.currentValue), String(result.currentValue));
  return updated;
}
