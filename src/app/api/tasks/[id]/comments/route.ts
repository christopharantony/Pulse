import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { addComment, listComments } from '@/features/tasks/services/task-comments.service';
import { createCommentSchema } from '@/features/tasks/validators/task-comments.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

function serializeComment(comment: { _id: ObjectId; taskId: ObjectId; authorId: ObjectId; body: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: comment._id.toHexString(),
    taskId: comment.taskId.toHexString(),
    authorId: comment.authorId.toHexString(),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const comments = await listComments(ctx, new ObjectId(id));
    return ok(comments.map(serializeComment), 'Comments');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const input = createCommentSchema.parse(await request.json());
    const comment = await addComment(ctx, new ObjectId(id), input.body);
    return ok(serializeComment(comment), 'Comment added', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
