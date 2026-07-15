import 'server-only';
import { type ObjectId, type Filter } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import type { GoalHabitContributionType, GoalHabitLink } from '@/features/goals/types/goal-habit-link';

// Hard-deleted, not soft-deletable — there is nothing to "restore" about a severed goal-habit link.
const base = createRepository<GoalHabitLink>({
  collectionName: COLLECTIONS.goalHabitLinks,
  softDelete: false,
});

export interface CreateGoalHabitLinkData {
  contributionType: GoalHabitContributionType;
  contributionWeight: number;
}

async function create(
  workspaceId: ObjectId,
  goalId: ObjectId,
  habitId: ObjectId,
  input: CreateGoalHabitLinkData
): Promise<GoalHabitLink> {
  return base.insertOne({
    workspaceId,
    goalId,
    habitId,
    contributionType: input.contributionType,
    contributionWeight: input.contributionWeight,
  });
}

async function findByGoalAndHabit(goalId: ObjectId, habitId: ObjectId): Promise<GoalHabitLink | null> {
  return base.findOne({ goalId, habitId } as Filter<GoalHabitLink>);
}

async function listByGoal(goalId: ObjectId): Promise<GoalHabitLink[]> {
  const collection = await base.collection();
  return collection.find({ goalId } as Filter<GoalHabitLink>).toArray() as Promise<GoalHabitLink[]>;
}

async function listByHabit(habitId: ObjectId): Promise<GoalHabitLink[]> {
  const collection = await base.collection();
  return collection.find({ habitId } as Filter<GoalHabitLink>).toArray() as Promise<GoalHabitLink[]>;
}

async function updateContribution(
  id: ObjectId,
  patch: Partial<CreateGoalHabitLinkData>
): Promise<GoalHabitLink | null> {
  return base.updateById(id, patch);
}

async function remove(id: ObjectId): Promise<boolean> {
  return base.hardDeleteById(id);
}

/** Cascade used by a goal's permanent-delete. */
async function deleteAllForGoal(goalId: ObjectId): Promise<void> {
  const collection = await base.collection();
  await collection.deleteMany({ goalId } as Filter<GoalHabitLink>);
}

/** Cascade used by a habit's permanent-delete. */
async function deleteAllForHabit(habitId: ObjectId): Promise<void> {
  const collection = await base.collection();
  await collection.deleteMany({ habitId } as Filter<GoalHabitLink>);
}

export const goalHabitLinksRepository = {
  ...base,
  create,
  findByGoalAndHabit,
  listByGoal,
  listByHabit,
  updateContribution,
  remove,
  deleteAllForGoal,
  deleteAllForHabit,
};
