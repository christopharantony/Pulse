import 'server-only';
import { ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';
import { goalHabitLinksRepository } from '@/features/goals/repositories/goal-habit-links.repository';
import { goalProgressSnapshotsRepository } from '@/features/goals/repositories/goal-progress-snapshots.repository';
import { recordGoalActivity } from '@/features/goals/services/goal-activity.service';
import { startTimerForSource, stopTimer, type StartTimerResult, type StopTimerResult } from '@/features/time-tracking/services/time-tracking.service';
import type { Goal, GoalStatus } from '@/features/goals/types/goal';
import type { CreateGoalInput, GoalListQueryInput, UpdateGoalInput } from '@/features/goals/validators/goals.schema';
import type { GoalDto, ListGoalsResult } from '@/features/goals/types/goal-dto';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';
import { clampLimit } from '@/lib/query/pagination';
import type { OffsetResult } from '@/lib/query/offset';

export class GoalError extends AppError {
  constructor(
    message: string,
    code: 'GOAL_NOT_FOUND' | 'GOAL_NOT_IN_TRASH' | 'INVALID_STATUS_TRANSITION',
    status: number
  ) {
    super(message, code, status);
  }
}

function notFound(): never {
  throw new GoalError('Goal not found', 'GOAL_NOT_FOUND', 404);
}

/** Load a goal and verify it belongs to the caller's workspace, or throw 404. Reused by every sibling goal-* service (milestones, goal-tasks, goal-habits) that needs the same ownership check. */
export async function getOwnedGoal(ctx: WorkspaceContext, id: ObjectId, opts?: { includeDeleted?: boolean }): Promise<Goal> {
  const goal = await goalsRepository.findById(id, opts);
  if (!goal || !goal.workspaceId.equals(ctx.workspaceId)) notFound();
  return goal;
}

/**
 * 0-100. `milestone`/`task`/`mixed` are always pre-computed as a percentage by
 * `goal-progress.service.ts` (they have no natural "target value" to divide by), so `currentValue`
 * is used directly. `manual`/`habit` compare `currentValue` against `targetValue` when one is set,
 * else `currentValue` is itself treated as a percentage (a percent-only manual goal).
 */
export function computeProgressPct(goal: Goal): number {
  const isPrecomputedPercent = goal.progressMethod === 'milestone' || goal.progressMethod === 'task' || goal.progressMethod === 'mixed';
  const raw = isPrecomputedPercent
    ? goal.currentValue
    : goal.targetValue && goal.targetValue > 0
      ? (goal.currentValue / goal.targetValue) * 100
      : goal.currentValue;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function toGoalDto(goal: Goal): GoalDto {
  return {
    id: goal._id.toHexString(),
    title: goal.title,
    description: goal.description,
    icon: goal.icon,
    color: goal.color,
    category: goal.category,
    customCategoryLabel: goal.customCategoryLabel,
    status: goal.status,
    priority: goal.priority,
    progressMethod: goal.progressMethod,
    startDate: goal.startDate?.toISOString() ?? null,
    targetDate: goal.targetDate?.toISOString() ?? null,
    completionDate: goal.completionDate?.toISOString() ?? null,
    targetValue: goal.targetValue,
    currentValue: goal.currentValue,
    progressPct: computeProgressPct(goal),
    visibility: goal.visibility,
    tagIds: goal.tagIds.map((id) => id.toHexString()),
    archivedAt: goal.archivedAt?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

// --- CRUD ---------------------------------------------------------------------------------------

export async function createGoal(ctx: WorkspaceContext, input: CreateGoalInput): Promise<GoalDto> {
  const goal = await goalsRepository.create(ctx.workspaceId, ctx.userId, {
    title: input.title,
    description: input.description ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    category: input.category,
    customCategoryLabel: input.customCategoryLabel ?? null,
    status: input.status,
    priority: input.priority,
    progressMethod: input.progressMethod,
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    targetValue: input.targetValue ?? null,
    visibility: input.visibility,
    tagIds: input.tagIds?.map((id) => new ObjectId(id)),
  });
  await recordGoalActivity(ctx, goal._id, 'created');
  return toGoalDto(goal);
}

export async function getGoalDetail(ctx: WorkspaceContext, id: ObjectId): Promise<GoalDto> {
  const goal = await getOwnedGoal(ctx, id, { includeDeleted: true });
  return toGoalDto(goal);
}

async function applyPatch(id: ObjectId, input: UpdateGoalInput): Promise<Goal> {
  const patch: Partial<Goal> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.icon !== undefined) patch.icon = input.icon ?? null;
  if (input.color !== undefined) patch.color = input.color ?? null;
  if (input.category !== undefined) patch.category = input.category;
  if (input.customCategoryLabel !== undefined) patch.customCategoryLabel = input.customCategoryLabel ?? null;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.progressMethod !== undefined) patch.progressMethod = input.progressMethod;
  if (input.startDate !== undefined) patch.startDate = input.startDate ?? null;
  if (input.targetDate !== undefined) patch.targetDate = input.targetDate ?? null;
  if (input.targetValue !== undefined) patch.targetValue = input.targetValue ?? null;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.tagIds !== undefined) {
    patch.tagIds = input.tagIds.map((tagId) => new ObjectId(tagId));
  }

  const updated = await goalsRepository.updateById(id, patch);
  if (!updated) notFound();
  return updated;
}

/** Update a goal. `status` is never patchable here — see `updateGoalStatus`/`completeGoal`/`archiveGoal`. */
export async function updateGoal(ctx: WorkspaceContext, id: ObjectId, input: UpdateGoalInput): Promise<GoalDto> {
  await getOwnedGoal(ctx, id);
  const updated = await applyPatch(id, input);
  await recordGoalActivity(ctx, id, 'updated');
  return toGoalDto(updated);
}

export async function deleteGoal(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  await getOwnedGoal(ctx, id);
  const ok = await goalsRepository.softDeleteById(id);
  if (!ok) notFound();
  await recordGoalActivity(ctx, id, 'deleted');
}

export async function restoreGoal(ctx: WorkspaceContext, id: ObjectId): Promise<GoalDto> {
  await getOwnedGoal(ctx, id, { includeDeleted: true });
  const restored = await goalsRepository.restore(id);
  if (!restored) notFound();
  await recordGoalActivity(ctx, id, 'restored');
  return toGoalDto(restored);
}

/**
 * Permanently delete a goal. Requires it to already be trashed. Cascades into every collection
 * that references the goal — milestones, goal_habit_links, goal_progress_snapshots — except
 * `goal_activity`, which is retained (audit trails outlive their subject). No transaction: this
 * codebase does use `withTransaction` (see `time-tracking.service.ts#stopTimer`), but reserves it
 * for cases where an inconsistent partial write is directly trust-breaking (a wrong timer total).
 * A rare, user-initiated, already-in-trash cascade doesn't carry that risk, so sequential
 * best-effort writes are an intentional, simpler choice here.
 */
export async function permanentlyDeleteGoal(ctx: WorkspaceContext, id: ObjectId): Promise<void> {
  const goal = await getOwnedGoal(ctx, id, { includeDeleted: true });
  if (!goal.deletedAt) {
    throw new GoalError('Goal must be trashed before it can be permanently deleted', 'GOAL_NOT_IN_TRASH', 409);
  }
  await milestonesRepository.deleteAllForGoal(id);
  await goalHabitLinksRepository.deleteAllForGoal(id);
  await goalProgressSnapshotsRepository.deleteAllForGoal(id);
  const ok = await goalsRepository.hardDeleteById(id);
  if (!ok) notFound();
}

// --- Status transitions ---------------------------------------------------------------------

/**
 * The single path for every status change — keeps `completionDate`/`archivedAt` side effects
 * consistent regardless of which route triggered the transition. `completeGoal`/`archiveGoal`/
 * `unarchiveGoal` are thin callers of this.
 */
export async function updateGoalStatus(ctx: WorkspaceContext, id: ObjectId, status: GoalStatus): Promise<GoalDto> {
  const goal = await getOwnedGoal(ctx, id);

  const patch: Partial<Goal> = { status };
  patch.completionDate = status === 'completed' ? new Date() : goal.status === 'completed' ? null : goal.completionDate;
  patch.archivedAt = status === 'archived' ? new Date() : goal.status === 'archived' ? null : goal.archivedAt;

  const updated = await goalsRepository.updateById(id, patch);
  if (!updated) notFound();

  await recordGoalActivity(ctx, id, 'status_changed', goal.status, status);
  if (status === 'completed') await recordGoalActivity(ctx, id, 'completed');
  if (status === 'archived') await recordGoalActivity(ctx, id, 'archived');

  return toGoalDto(updated);
}

export async function completeGoal(ctx: WorkspaceContext, id: ObjectId): Promise<GoalDto> {
  return updateGoalStatus(ctx, id, 'completed');
}

export async function archiveGoal(ctx: WorkspaceContext, id: ObjectId): Promise<GoalDto> {
  return updateGoalStatus(ctx, id, 'archived');
}

export async function unarchiveGoal(ctx: WorkspaceContext, id: ObjectId): Promise<GoalDto> {
  return updateGoalStatus(ctx, id, 'active');
}

// --- Manual progress -------------------------------------------------------------------------

export async function updateGoalProgress(
  ctx: WorkspaceContext,
  id: ObjectId,
  input: { currentValue?: number; progressPct?: number }
): Promise<GoalDto> {
  const goal = await getOwnedGoal(ctx, id);
  const currentValue =
    input.currentValue !== undefined
      ? input.currentValue
      : goal.targetValue && goal.targetValue > 0
        ? (input.progressPct! / 100) * goal.targetValue
        : input.progressPct!;

  const updated = await goalsRepository.setProgress(id, { currentValue });
  if (!updated) notFound();
  await recordGoalActivity(ctx, id, 'progress_updated', String(goal.currentValue), String(currentValue));
  return toGoalDto(updated);
}

// --- List / search / trash ------------------------------------------------------------------

export async function listGoals(ctx: WorkspaceContext, query: GoalListQueryInput): Promise<ListGoalsResult> {
  const result: OffsetResult<Goal> = await goalsRepository.listFiltered(
    ctx.workspaceId,
    {
      status: query.status,
      priority: query.priority,
      category: query.category,
      progressMin: query.progressMin,
      progressMax: query.progressMax,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      q: query.q,
      includeArchived: query.includeArchived,
      includeDeleted: query.includeDeleted,
    },
    { field: query.sortBy, direction: query.sortDir },
    { page: query.page, limit: query.limit }
  );

  return {
    items: result.items.map(toGoalDto),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  };
}

export async function searchGoals(ctx: WorkspaceContext, term: string, opts?: { limit?: number }): Promise<GoalDto[]> {
  const result = await listGoals(ctx, { q: term, limit: clampLimit(opts?.limit) });
  return result.items;
}

export async function listGoalTrash(ctx: WorkspaceContext): Promise<GoalDto[]> {
  const goals = await goalsRepository.listTrash(ctx.workspaceId);
  return goals.map(toGoalDto);
}

// --- Timer (Activity Engine) -----------------------------------------------------------------

/**
 * Start a timer against a goal — lets a user time work directly on it without an intermediate
 * task, the same pattern `habits.service.ts#startHabitTimer` uses. Unlike Habit (gated to
 * `type === 'duration'`), any goal can be timed; there's no goal "type" that would make timing
 * meaningless.
 */
export async function startGoalTimer(ctx: WorkspaceContext, id: ObjectId, input: { note?: string | null }): Promise<StartTimerResult> {
  const goal = await getOwnedGoal(ctx, id);
  return startTimerForSource(ctx, {
    sourceType: 'goal',
    sourceId: id,
    title: goal.title,
    color: goal.color,
    note: input.note ?? null,
  });
}

export async function stopGoalTimer(ctx: WorkspaceContext, id: ObjectId, sessionId: ObjectId): Promise<StopTimerResult> {
  await getOwnedGoal(ctx, id);
  return stopTimer(ctx, sessionId);
}
