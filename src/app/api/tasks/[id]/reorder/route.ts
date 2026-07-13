import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { reorderTask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { reorderTaskSchema } from '@/features/tasks/validators/tasks.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/tasks/:id/reorder — change order within the current status column (list drag). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const input = reorderTaskSchema.parse(await request.json());
    const task = await reorderTask(ctx, new ObjectId(id), input.order);
    return ok(serializeTask(task, null), 'Task reordered');
  } catch (error) {
    return handleRouteError(error);
  }
}
