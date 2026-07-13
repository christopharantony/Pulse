import 'server-only';
import type { ObjectId } from 'mongodb';
import { taskCommentsRepository } from '@/features/tasks/repositories/task-comments.repository';
import { tasksRepository } from '@/features/tasks/repositories/tasks.repository';
import type { TaskComment } from '@/features/tasks/types/task-comment';
import type { WorkspaceContext } from '@/features/workspace/services/require-workspace';
import { AppError } from '@/lib/app-error';

export class TaskCommentError extends AppError {
  constructor(message: string, code: 'TASK_NOT_FOUND' | 'COMMENT_NOT_FOUND', status: number) {
    super(message, code, status);
  }
}

/** Comments have no `workspaceId` of their own — verify ownership via the parent task. */
async function assertOwnsTask(ctx: WorkspaceContext, taskId: ObjectId): Promise<void> {
  const task = await tasksRepository.findById(taskId, { includeDeleted: true });
  if (!task || !task.workspaceId.equals(ctx.workspaceId)) {
    throw new TaskCommentError('Task not found', 'TASK_NOT_FOUND', 404);
  }
}

export async function addComment(ctx: WorkspaceContext, taskId: ObjectId, body: string): Promise<TaskComment> {
  await assertOwnsTask(ctx, taskId);
  return taskCommentsRepository.create({
    workspaceId: ctx.workspaceId,
    taskId,
    authorId: ctx.userId,
    body,
  });
}

export async function listComments(ctx: WorkspaceContext, taskId: ObjectId): Promise<TaskComment[]> {
  await assertOwnsTask(ctx, taskId);
  const result = await taskCommentsRepository.listByTask(ctx.workspaceId, taskId, { limit: 200 });
  return result.items;
}

export async function deleteComment(ctx: WorkspaceContext, taskId: ObjectId, commentId: ObjectId): Promise<void> {
  await assertOwnsTask(ctx, taskId);
  const comment = await taskCommentsRepository.findById(commentId);
  if (!comment || !comment.taskId.equals(taskId)) {
    throw new TaskCommentError('Comment not found', 'COMMENT_NOT_FOUND', 404);
  }
  await taskCommentsRepository.hardDeleteById(commentId);
}
