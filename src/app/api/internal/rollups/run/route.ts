import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { runRollupsForYesterday } from '@/features/analytics/services/rollup.service';

/**
 * POST /api/internal/rollups/run — nightly analytics rollup, invoked by an external scheduler (e.g.
 * platform cron). Not a user route: guarded by a shared secret in the `Authorization: Bearer` header
 * matched against `CRON_SECRET`. Disabled (503) when the secret isn't configured, so it can never be
 * called unauthenticated by accident.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return fail('Rollup endpoint is not configured', 503);

    const provided = request.headers.get('authorization');
    if (provided !== `Bearer ${secret}`) return fail('Forbidden', 403);

    const result = await runRollupsForYesterday();
    return ok(result, 'Rollups complete');
  } catch (error) {
    return handleRouteError(error);
  }
}
