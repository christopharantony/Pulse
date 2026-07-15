import 'server-only';
import { type ObjectId } from 'mongodb';
import { milestonesRepository } from '@/features/goals/repositories/milestones.repository';
import type { Milestone } from '@/features/goals/types/milestone';
import type { MilestoneDto } from '@/features/goals/types/milestone-dto';
import type { CreateMilestoneInput, UpdateMilestoneInput } from '@/features/goals/validators/milestones.schema';
import { getOwnedGoal } from '@/features/goals/services/goals.service';
import { recomputeGoalProgress } from '@/features/goals/services/goal-progress.service';
import { recordGoalActivity } from '@/features/goals/services/goal-activity.service';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

export class MilestoneError extends AppError {
  constructor(message: string, code: 'MILESTONE_NOT_FOUND', status: number) {
    super(message, code, status);
  }
}

function notFound(): never {
  throw new MilestoneError('Milestone not found', 'MILESTONE_NOT_FOUND', 404);
}

function toMilestoneDto(milestone: Milestone): MilestoneDto {
  return {
    id: milestone._id.toHexString(),
    goalId: milestone.goalId.toHexString(),
    title: milestone.title,
    description: milestone.description,
    dueDate: milestone.dueDate?.toISOString() ?? null,
    completedDate: milestone.completedDate?.toISOString() ?? null,
    order: milestone.order,
    status: milestone.status,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}

/** Load a milestone and verify it belongs to the given (already-owned) goal, or throw 404. */
async function getOwnedMilestone(goalId: ObjectId, milestoneId: ObjectId): Promise<Milestone> {
  const milestone = await milestonesRepository.findById(milestoneId);
  if (!milestone || !milestone.goalId.equals(goalId)) notFound();
  return milestone;
}

export async function listMilestones(ctx: WorkspaceContext, goalId: ObjectId): Promise<MilestoneDto[]> {
  await getOwnedGoal(ctx, goalId);
  const result = await milestonesRepository.listByGoal(goalId, { limit: 200 });
  return result.items.sort((a, b) => a.order - b.order).map(toMilestoneDto);
}

export async function addMilestone(ctx: WorkspaceContext, goalId: ObjectId, input: CreateMilestoneInput): Promise<MilestoneDto> {
  await getOwnedGoal(ctx, goalId);
  const order = await milestonesRepository.nextOrderValue(goalId);
  const milestone = await milestonesRepository.create(ctx.workspaceId, goalId, {
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    order,
  });
  await recordGoalActivity(ctx, goalId, 'milestone_added', null, milestone.title);
  await recomputeGoalProgress(ctx, goalId);
  return toMilestoneDto(milestone);
}

export async function updateMilestone(
  ctx: WorkspaceContext,
  goalId: ObjectId,
  milestoneId: ObjectId,
  input: UpdateMilestoneInput
): Promise<MilestoneDto> {
  await getOwnedGoal(ctx, goalId);
  await getOwnedMilestone(goalId, milestoneId);

  const patch: Partial<Milestone> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate ?? null;

  const updated = await milestonesRepository.updateById(milestoneId, patch);
  if (!updated) notFound();
  return toMilestoneDto(updated);
}

export async function deleteMilestone(ctx: WorkspaceContext, goalId: ObjectId, milestoneId: ObjectId): Promise<void> {
  await getOwnedGoal(ctx, goalId);
  const milestone = await getOwnedMilestone(goalId, milestoneId);
  const ok = await milestonesRepository.softDeleteById(milestoneId);
  if (!ok) notFound();
  await recordGoalActivity(ctx, goalId, 'milestone_deleted', milestone.title, null);
  await recomputeGoalProgress(ctx, goalId);
}

export async function completeMilestone(ctx: WorkspaceContext, goalId: ObjectId, milestoneId: ObjectId): Promise<MilestoneDto> {
  await getOwnedGoal(ctx, goalId);
  await getOwnedMilestone(goalId, milestoneId);
  const updated = await milestonesRepository.setStatus(milestoneId, 'completed');
  if (!updated) notFound();
  await recordGoalActivity(ctx, goalId, 'milestone_completed', null, updated.title);
  await recomputeGoalProgress(ctx, goalId);
  return toMilestoneDto(updated);
}

export async function reorderMilestones(ctx: WorkspaceContext, goalId: ObjectId, orderedIds: ObjectId[]): Promise<MilestoneDto[]> {
  await getOwnedGoal(ctx, goalId);
  await milestonesRepository.reorder(goalId, orderedIds);
  return listMilestones(ctx, goalId);
}
