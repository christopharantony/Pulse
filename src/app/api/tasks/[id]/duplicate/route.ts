import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { duplicateTask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { duplicateTaskSchema } from '@/features/tasks/validators/tasks.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const body = await request.text();
    const input = duplicateTaskSchema.parse(body ? JSON.parse(body) : undefined);
    const task = await duplicateTask(ctx, new ObjectId(id), input);
    return ok(serializeTask(task, null), 'Task duplicated', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
