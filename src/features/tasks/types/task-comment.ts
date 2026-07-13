import type { ObjectId } from 'mongodb';

/**
 * A comment on a task. A separate collection (not embedded in Task) because comment threads grow
 * without bound. Removed by hard delete, so this collection is not soft-deletable.
 */
export interface TaskComment {
  _id: ObjectId;
  workspaceId: ObjectId;
  taskId: ObjectId;
  authorId: ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}
