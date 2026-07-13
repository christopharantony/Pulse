import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { permanentlyDeleteTask } from '@/features/tasks/services/tasks.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    await permanentlyDeleteTask(ctx, new ObjectId(id));
    return ok(null, 'Task permanently deleted');
  } catch (error) {
    return handleRouteError(error);
  }
}
