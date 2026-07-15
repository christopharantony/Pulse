import 'server-only';
import type { ObjectId } from 'mongodb';
import { goalActivityRepository, type GoalActivity, type GoalActivityType } from '@/features/goals/repositories/goal-activity.repository';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import type { GoalActivityDto } from '@/features/goals/types/goal-activity-dto';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

/**
 * Deliberately does NOT import `getOwnedGoal` from `goals.service.ts` — that module will call
 * `recordGoalActivity` below, and importing back would cycle. Re-checks ownership directly
 * against the repository instead (a few duplicated lines, same trade-off as `goal-progress.service.ts`).
 */

/** Thin wrapper every mutating goal-* service calls after a write — keeps the call sites one-liners. */
export async function recordGoalActivity(
  ctx: WorkspaceContext,
  goalId: ObjectId,
  type: GoalActivityType,
  fromValue?: string | null,
  toValue?: string | null
): Promise<void> {
  await goalActivityRepository.record({
    workspaceId: ctx.workspaceId,
    goalId,
    userId: ctx.userId,
    type,
    fromValue,
    toValue,
  });
}

function toGoalActivityDto(activity: GoalActivity): GoalActivityDto {
  return {
    id: activity._id.toHexString(),
    goalId: activity.goalId.toHexString(),
    userId: activity.userId.toHexString(),
    type: activity.type,
    fromValue: activity.fromValue,
    toValue: activity.toValue,
    createdAt: activity.createdAt.toISOString(),
  };
}

export async function listGoalActivity(ctx: WorkspaceContext, goalId: ObjectId): Promise<GoalActivityDto[]> {
  const goal = await goalsRepository.findById(goalId, { includeDeleted: true });
  if (!goal || !goal.workspaceId.equals(ctx.workspaceId)) {
    throw new AppError('Goal not found', 'GOAL_NOT_FOUND', 404);
  }
  const items = await goalActivityRepository.listByGoal(goalId);
  return items.map(toGoalActivityDto);
}
