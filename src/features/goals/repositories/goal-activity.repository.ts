import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';

export type GoalActivityType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'milestone_added'
  | 'milestone_completed'
  | 'milestone_deleted'
  | 'task_attached'
  | 'task_detached'
  | 'task_completed'
  | 'habit_linked'
  | 'habit_unlinked'
  | 'progress_updated'
  | 'completed'
  | 'archived'
  | 'restored'
  | 'deleted';

export interface GoalActivity {
  _id: ObjectId;
  workspaceId: ObjectId;
  goalId: ObjectId;
  userId: ObjectId;
  type: GoalActivityType;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Append-only audit trail for goal lifecycle events — mirrors `taskActivityRepository` exactly. */
const base = createRepository<GoalActivity>({
  collectionName: COLLECTIONS.goalActivity,
  softDelete: false,
});

async function record(input: {
  workspaceId: ObjectId;
  goalId: ObjectId;
  userId: ObjectId;
  type: GoalActivityType;
  fromValue?: string | null;
  toValue?: string | null;
}): Promise<GoalActivity> {
  return base.insertOne({
    workspaceId: input.workspaceId,
    goalId: input.goalId,
    userId: input.userId,
    type: input.type,
    fromValue: input.fromValue ?? null,
    toValue: input.toValue ?? null,
  });
}

async function listByGoal(goalId: ObjectId, opts?: { limit?: number }): Promise<GoalActivity[]> {
  const collection = await base.collection();
  return collection
    .find({ goalId })
    .sort({ createdAt: -1 })
    .limit(opts?.limit ?? 100)
    .toArray() as Promise<GoalActivity[]>;
}

export const goalActivityRepository = {
  ...base,
  record,
  listByGoal,
};
