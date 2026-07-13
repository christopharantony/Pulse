import type { NextRequest } from 'next/server';
import { fail, handleRouteError, ok } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { bulkArchiveTasks } from '@/features/tasks/services/tasks.service';
import { bulkTaskIdsSchema } from '@/features/tasks/validators/tasks.schema';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = bulkTaskIdsSchema.parse(await request.json());
    const modified = await bulkArchiveTasks(ctx, input.ids);
    return ok({ modified }, 'Tasks archived');
  } catch (error) {
    return handleRouteError(error);
  }
}
