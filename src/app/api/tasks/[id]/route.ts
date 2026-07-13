import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { deleteTask, getTaskDetail, updateTask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { updateTaskSchema } from '@/features/tasks/validators/tasks.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const task = await getTaskDetail(ctx, new ObjectId(id));
    return ok(task, 'Task');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const input = updateTaskSchema.parse(await request.json());
    const task = await updateTask(ctx, new ObjectId(id), input);
    return ok(serializeTask(task, null), 'Task updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    await deleteTask(ctx, new ObjectId(id));
    return ok(null, 'Task moved to trash');
  } catch (error) {
    return handleRouteError(error);
  }
}
