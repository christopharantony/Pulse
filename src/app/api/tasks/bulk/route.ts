import type { NextRequest } from 'next/server';
import { fail, handleRouteError, ok } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { bulkDeleteTasks, bulkUpdateTasks } from '@/features/tasks/services/tasks.service';
import { bulkTaskIdsSchema, bulkUpdateTaskSchema } from '@/features/tasks/validators/tasks.schema';

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = bulkUpdateTaskSchema.parse(await request.json());
    const modified = await bulkUpdateTasks(ctx, input.ids, input.patch);
    return ok({ modified }, 'Tasks updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = bulkTaskIdsSchema.parse(await request.json());
    const modified = await bulkDeleteTasks(ctx, input.ids);
    return ok({ modified }, 'Tasks moved to trash');
  } catch (error) {
    return handleRouteError(error);
  }
}
