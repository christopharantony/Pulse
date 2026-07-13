import type { NextRequest } from 'next/server';
import { fail, handleRouteError, ok } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { searchTasks } from '@/features/tasks/services/tasks.service';

/**
 * GET /api/tasks/search?q= — `q`-only convenience alias for `GET /api/tasks?q=`, kept as a
 * dedicated endpoint because search-as-you-type UX wants a distinct debounce/cancel target from
 * the filtered list view.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const q = request.nextUrl.searchParams.get('q') ?? '';
    const limitParam = request.nextUrl.searchParams.get('limit');
    const items = await searchTasks(ctx, q, { limit: limitParam ? Number(limitParam) : undefined });
    return ok(items, 'Search results');
  } catch (error) {
    return handleRouteError(error);
  }
}
