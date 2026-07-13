import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { removeSubtask, updateSubtask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { isValidObjectId } from '@/lib/mongo/object-id';

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  order: z.number().optional(),
});

type Params = { params: Promise<{ id: string; subtaskId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, subtaskId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(subtaskId)) return fail('Invalid id', 400);

    const input = updateSubtaskSchema.parse(await request.json());
    const task = await updateSubtask(ctx, new ObjectId(id), new ObjectId(subtaskId), input);
    return ok(serializeTask(task, null), 'Subtask updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, subtaskId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(subtaskId)) return fail('Invalid id', 400);

    const task = await removeSubtask(ctx, new ObjectId(id), new ObjectId(subtaskId));
    return ok(serializeTask(task, null), 'Subtask removed');
  } catch (error) {
    return handleRouteError(error);
  }
}
