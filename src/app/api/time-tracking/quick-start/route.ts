import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getQuickStartActivities } from '@/features/time-tracking/services/time-tracking-summary.service';

/** GET /api/time-tracking/quick-start — recently-tracked activities, for a "resume" list. */
export async function GET() {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const activities = await getQuickStartActivities(ctx);
    return ok(
      activities.map((activity) => ({
        id: activity._id.toHexString(),
        title: activity.title,
        color: activity.color,
        sourceType: activity.sourceType,
        totalTrackedSeconds: activity.totalTrackedSeconds,
        lastTrackedAt: activity.lastTrackedAt ? activity.lastTrackedAt.toISOString() : null,
      }))
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
