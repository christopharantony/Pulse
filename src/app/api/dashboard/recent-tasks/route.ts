import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { buildRecentTasks } from '@/features/dashboard/services/recent-tasks.aggregator';

/**
 * GET /api/dashboard/recent-tasks?offset=&limit= — the "load more" page of recent tasks. Offset
 * pagination because the list is sorted by recency (`updatedAt`), which the shared cursor can't
 * express. Returns `nextOffset: null` on the last page.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const params = request.nextUrl.searchParams;
    const offset = Number(params.get('offset') ?? 0);
    const limit = params.get('limit') != null ? Number(params.get('limit')) : null;

    const data = await buildRecentTasks(ctx, { offset, limit });
    return ok(data, 'Recent tasks');
  } catch (error) {
    return handleRouteError(error);
  }
}
