import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { TaskComment } from '@/features/tasks/types/task-comment';

const base = createRepository<TaskComment>({
  collectionName: COLLECTIONS.taskComments,
  softDelete: false,
});

async function create(input: {
  workspaceId: ObjectId;
  taskId: ObjectId;
  authorId: ObjectId;
  body: string;
}): Promise<TaskComment> {
  return base.insertOne(input);
}

/** Comments for a task, cursor-paginated (newest first). */
async function listByTask(
  workspaceId: ObjectId,
  taskId: ObjectId,
  opts?: FindManyOptions
): Promise<PaginatedResult<TaskComment>> {
  return base.findMany(withWorkspaceScope({ taskId }, workspaceId), opts);
}

export const taskCommentsRepository = {
  ...base,
  create,
  listByTask,
};
