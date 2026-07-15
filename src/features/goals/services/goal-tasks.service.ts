import 'server-only';
import type { ObjectId } from 'mongodb';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import { getTask, listTasks, updateTask } from '@/features/tasks/services/tasks.service';
import type { TaskListItemDto } from '@/features/tasks/types/task-dto';
import { getOwnedGoal } from '@/features/goals/services/goals.service';
import { recomputeGoalProgress } from '@/features/goals/services/goal-progress.service';
import { recordGoalActivity } from '@/features/goals/services/goal-activity.service';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

export class GoalTaskError extends AppError {
  constructor(message: string, code: 'TASK_ALREADY_LINKED' | 'TASK_NOT_LINKED', status: number) {
    super(message, code, status);
  }
}

export interface GoalTaskCounts {
  completed: number;
  overdue: number;
  remaining: number;
  total: number;
}

/** Completed/overdue/remaining/total counts for a goal's linked tasks — computed on read. */
export async function countTasksByGoal(ctx: WorkspaceContext, goalId: ObjectId): Promise<GoalTaskCounts> {
  await getOwnedGoal(ctx, goalId);
  return tasksRepository.countByGoal(ctx.workspaceId, goalId);
}

export interface GoalTasksResult {
  items: TaskListItemDto[];
  counts: GoalTaskCounts;
}

/** The goal detail page's "Linked Tasks" section: the task list plus its rollup counts. */
export async function listGoalTasks(ctx: WorkspaceContext, goalId: ObjectId): Promise<GoalTasksResult> {
  await getOwnedGoal(ctx, goalId);
  const [tasks, counts] = await Promise.all([
    listTasks(ctx, { goalId: goalId.toHexString(), limit: 200 }),
    tasksRepository.countByGoal(ctx.workspaceId, goalId),
  ]);
  return { items: tasks.items, counts };
}

/**
 * Link a task to a goal. Delegates the actual write to `tasksService.updateTask` (the single
 * source of truth for task mutation, including its own ownership check and activity logging) so
 * setting `goalId` can never drift from any other task edit path.
 */
export async function attachTask(ctx: WorkspaceContext, goalId: ObjectId, taskId: ObjectId): Promise<void> {
  await getOwnedGoal(ctx, goalId);
  const task = await getTask(ctx, taskId);
  if (task.goalId && !task.goalId.equals(goalId)) {
    throw new GoalTaskError('Task is already linked to a different goal', 'TASK_ALREADY_LINKED', 409);
  }
  await updateTask(ctx, taskId, { goalId: goalId.toHexString() });
  await recordGoalActivity(ctx, goalId, 'task_attached', null, task.title);
  await recomputeGoalProgress(ctx, goalId);
}

export async function detachTask(ctx: WorkspaceContext, goalId: ObjectId, taskId: ObjectId): Promise<void> {
  await getOwnedGoal(ctx, goalId);
  const task = await getTask(ctx, taskId);
  if (!task.goalId || !task.goalId.equals(goalId)) {
    throw new GoalTaskError('Task is not linked to this goal', 'TASK_NOT_LINKED', 409);
  }
  await updateTask(ctx, taskId, { goalId: null });
  await recordGoalActivity(ctx, goalId, 'task_detached', task.title, null);
  await recomputeGoalProgress(ctx, goalId);
}
