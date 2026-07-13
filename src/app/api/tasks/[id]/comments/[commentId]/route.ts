import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { deleteComment } from '@/features/tasks/services/task-comments.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, commentId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(commentId)) return fail('Invalid id', 400);

    await deleteComment(ctx, new ObjectId(id), new ObjectId(commentId));
    return ok(null, 'Comment deleted');
  } catch (error) {
    return handleRouteError(error);
  }
}
