import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { runGoalNotificationChecks } from '@/features/goals/services/goals-notifications.service';

/**
 * POST /api/internal/goals/notifications/run — nightly goal-deadline/milestone-due/inactivity
 * checks, invoked by an external scheduler. Same skeleton as `/api/internal/rollups/run`: guarded
 * by a shared secret in `Authorization: Bearer`, matched against `CRON_SECRET`.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return fail('Notification checks endpoint is not configured', 503);

    const provided = request.headers.get('authorization');
    if (provided !== `Bearer ${secret}`) return fail('Forbidden', 403);

    const result = await runGoalNotificationChecks();
    return ok(result, 'Goal notification checks complete');
  } catch (error) {
    return handleRouteError(error);
  }
}
