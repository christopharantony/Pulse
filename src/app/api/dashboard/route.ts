import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getOverview } from '@/features/dashboard/services/dashboard.service';

/**
 * GET /api/dashboard — the BFF aggregate for the first paint. Resolves the caller's workspace, then
 * fans out every dashboard section server-side and returns one composed payload. `?month=YYYY-MM`
 * optionally selects the calendar-preview month.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const month = request.nextUrl.searchParams.get('month') ?? undefined;
    const overview = await getOverview(ctx, { month });
    return ok(overview, 'Dashboard overview');
  } catch (error) {
    return handleRouteError(error);
  }
}
