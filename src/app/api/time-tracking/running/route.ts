import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getRunningSession } from '@/features/time-tracking/services/time-tracking-summary.service';

/** GET /api/time-tracking/running — the user's currently-running timer (any source), or null. */
export async function GET() {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const running = await getRunningSession(ctx);
    return ok(
      running && {
        sessionId: running.session._id.toHexString(),
        activityId: running.activity._id.toHexString(),
        activityTitle: running.activity.title,
        activityColor: running.activity.color,
        sourceType: running.activity.sourceType,
        sourceId: running.activity.sourceId ? running.activity.sourceId.toHexString() : null,
        startedAt: running.session.startedAt.toISOString(),
      }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
