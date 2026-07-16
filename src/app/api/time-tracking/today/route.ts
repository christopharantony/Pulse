import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getTodaySummary } from '@/features/time-tracking/services/time-tracking-summary.service';

/** GET /api/time-tracking/today — today's tracked time, including the live running timer. */
export async function GET() {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const summary = await getTodaySummary(ctx);
    return ok(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}
