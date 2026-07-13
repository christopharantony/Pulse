import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { createTask, listTasks } from '@/features/tasks/services/tasks.service';
import { serializeTask } from '@/features/tasks/services/task-serializer';
import { createTaskSchema, taskListQuerySchema } from '@/features/tasks/validators/tasks.schema';

/**
 * GET /api/tasks — list tasks with filters/sort/offset-pagination. Array-valued params
 * (`status`, `priority`, `tagIds`) are read via `getAll` so repeats (`?status=todo&status=waiting`)
 * survive — `Object.fromEntries` would silently collapse them to the last value.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const sp = request.nextUrl.searchParams;
    const raw: Record<string, unknown> = Object.fromEntries(sp.entries());
    if (sp.has('status')) raw.status = sp.getAll('status');
    if (sp.has('priority')) raw.priority = sp.getAll('priority');
    if (sp.has('tagIds')) raw.tagIds = sp.getAll('tagIds');

    const query = taskListQuerySchema.parse(raw);
    const result = await listTasks(ctx, query);
    return ok(result, 'Tasks');
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/tasks — create a task in the caller's workspace. Backs the dashboard "quick create"
 * action; returns the created task in the same serialized shape the list uses so the client can
 * optimistically insert it.
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
