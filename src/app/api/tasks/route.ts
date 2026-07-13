import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { createTask } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/dashboard/services/recent-tasks.aggregator';
import { createTaskSchema } from '@/features/tasks/validators/tasks.schema';

/**
 * POST /api/tasks — create a task in the caller's workspace. Backs the dashboard "quick create"
 * action; returns the created task in the same serialized shape the Recent Tasks list uses so the
 * client can optimistically insert it.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = createTaskSchema.parse(await request.json());
    const task = await createTask(ctx, input);
    return ok(serializeTask(task, null), 'Task created', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
