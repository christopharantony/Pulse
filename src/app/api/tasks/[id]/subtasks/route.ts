import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { addSubtask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { objectIdStringSchema } from '@/schemas/object-id.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

const addSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
  parentSubtaskId: objectIdStringSchema.nullable().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const input = addSubtaskSchema.parse(await request.json());
    const task = await addSubtask(ctx, new ObjectId(id), input.parentSubtaskId ?? null, input.title);
    return ok(serializeTask(task, null), 'Subtask added', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
