import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getHistory } from '@/features/time-tracking/services/time-tracking-summary.service';
import { historyQuerySchema } from '@/features/time-tracking/validators/time-tracking.schema';

/** GET /api/time-tracking/history?days=10 — daily tracked-time totals, oldest first, zero-filled. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { days } = historyQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const history = await getHistory(ctx, days);
    return ok(history);
  } catch (error) {
    return handleRouteError(error);
  }
}
