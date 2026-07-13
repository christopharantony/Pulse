import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { completeTask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/tasks/:id/complete — routes through the recurrence engine (rolls a recurring series forward). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const task = await completeTask(ctx, new ObjectId(id));
    return ok(serializeTask(task, null), 'Task completed');
  } catch (error) {
    return handleRouteError(error);
  }
}
