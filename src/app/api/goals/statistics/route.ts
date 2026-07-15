import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getGoalsOverviewStatistics } from '@/features/goals/services/goal-statistics.service';

/** GET /api/goals/statistics?from=&to= — workspace-wide goal statistics (Statistics page). */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const sp = request.nextUrl.searchParams;
    const from = sp.get('from');
    const to = sp.get('to');
    const stats = await getGoalsOverviewStatistics(ctx, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return ok(stats, 'Goals overview statistics');
  } catch (error) {
    return handleRouteError(error);
  }
}
