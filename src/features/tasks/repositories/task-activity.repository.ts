import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';

export type TaskActivityType =
  | 'created'
  | 'status_changed'
  | 'archived'
  | 'restored'
  | 'deleted';

export interface TaskActivity {
  _id: ObjectId;
  workspaceId: ObjectId;
  taskId: ObjectId;
  userId: ObjectId;
  type: TaskActivityType;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Append-only audit trail for task lifecycle events — a source of truth for future Notifications. */
const base = createRepository<TaskActivity>({
  collectionName: COLLECTIONS.taskActivity,
  softDelete: false,
});

async function record(input: {
  workspaceId: ObjectId;
  taskId: ObjectId;
  userId: ObjectId;
  type: TaskActivityType;
  fromValue?: string | null;
  toValue?: string | null;
}): Promise<TaskActivity> {
  return base.insertOne({
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    userId: input.userId,
    type: input.type,
    fromValue: input.fromValue ?? null,
    toValue: input.toValue ?? null,
  });
}

async function listByTask(taskId: ObjectId): Promise<TaskActivity[]> {
  const collection = await base.collection();
  return collection.find({ taskId }).sort({ createdAt: -1 }).toArray() as Promise<TaskActivity[]>;
}

export const taskActivityRepository = {
  ...base,
  record,
  listByTask,
};
