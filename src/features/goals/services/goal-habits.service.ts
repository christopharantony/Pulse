import 'server-only';
import type { ObjectId } from 'mongodb';
import { goalHabitLinksRepository } from '@/features/goals/repositories/goal-habit-links.repository';
import type { GoalHabitLink } from '@/features/goals/types/goal-habit-link';
import type { GoalHabitLinkDto } from '@/features/goals/types/goal-habit-link-dto';
import type { LinkGoalHabitInput, UpdateGoalHabitLinkInput } from '@/features/goals/validators/goal-habit-links.schema';
import { getOwnedGoal } from '@/features/goals/services/goals.service';
import { recomputeGoalProgress, sumHabitContribution } from '@/features/goals/services/goal-progress.service';
import { recordGoalActivity } from '@/features/goals/services/goal-activity.service';
import { getOwnedHabit } from '@/features/habits/services/habits.service';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

export class GoalHabitError extends AppError {
  constructor(message: string, code: 'HABIT_LINK_EXISTS' | 'HABIT_NOT_LINKED', status: number) {
    super(message, code, status);
  }
}

function toGoalHabitLinkDto(link: GoalHabitLink): GoalHabitLinkDto {
  return {
    id: link._id.toHexString(),
    goalId: link.goalId.toHexString(),
    habitId: link.habitId.toHexString(),
    contributionType: link.contributionType,
    contributionWeight: link.contributionWeight,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

export async function listLinkedHabits(ctx: WorkspaceContext, goalId: ObjectId): Promise<GoalHabitLinkDto[]> {
  await getOwnedGoal(ctx, goalId);
  const links = await goalHabitLinksRepository.listByGoal(goalId);
  return links.map(toGoalHabitLinkDto);
}

export async function linkHabit(
  ctx: WorkspaceContext,
  goalId: ObjectId,
  habitId: ObjectId,
  input: Pick<LinkGoalHabitInput, 'contributionType' | 'contributionWeight'>
): Promise<GoalHabitLinkDto> {
  await getOwnedGoal(ctx, goalId);
  const habit = await getOwnedHabit(ctx, habitId);

  const existing = await goalHabitLinksRepository.findByGoalAndHabit(goalId, habitId);
  if (existing) {
    throw new GoalHabitError('Habit is already linked to this goal', 'HABIT_LINK_EXISTS', 409);
  }

  const link = await goalHabitLinksRepository.create(ctx.workspaceId, goalId, habitId, input);
  await recordGoalActivity(ctx, goalId, 'habit_linked', null, habit.name);
  await recomputeGoalProgress(ctx, goalId);
  return toGoalHabitLinkDto(link);
}

export async function unlinkHabit(ctx: WorkspaceContext, goalId: ObjectId, habitId: ObjectId): Promise<void> {
  await getOwnedGoal(ctx, goalId);
  const habit = await getOwnedHabit(ctx, habitId);
  const existing = await goalHabitLinksRepository.findByGoalAndHabit(goalId, habitId);
  if (!existing) {
    throw new GoalHabitError('Habit is not linked to this goal', 'HABIT_NOT_LINKED', 409);
  }
  await goalHabitLinksRepository.remove(existing._id);
  await recordGoalActivity(ctx, goalId, 'habit_unlinked', habit.name, null);
  await recomputeGoalProgress(ctx, goalId);
}

export async function updateHabitContribution(
  ctx: WorkspaceContext,
  goalId: ObjectId,
  habitId: ObjectId,
  input: UpdateGoalHabitLinkInput
): Promise<GoalHabitLinkDto> {
  await getOwnedGoal(ctx, goalId);
  const existing = await goalHabitLinksRepository.findByGoalAndHabit(goalId, habitId);
  if (!existing) {
    throw new GoalHabitError('Habit is not linked to this goal', 'HABIT_NOT_LINKED', 409);
  }
  const updated = await goalHabitLinksRepository.updateContribution(existing._id, input);
  await recomputeGoalProgress(ctx, goalId);
  return toGoalHabitLinkDto(updated!);
}

/** The goal detail page's "Linked Habits" contribution total — reuses the progress engine's sum. */
export async function computeHabitContribution(ctx: WorkspaceContext, goalId: ObjectId): Promise<number> {
  const goal = await getOwnedGoal(ctx, goalId);
  return sumHabitContribution(goal);
}
