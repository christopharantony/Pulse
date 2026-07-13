import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { archiveTask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const task = await archiveTask(ctx, new ObjectId(id));
    return ok(serializeTask(task, null), 'Task archived');
  } catch (error) {
    return handleRouteError(error);
  }
}
