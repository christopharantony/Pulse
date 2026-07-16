import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { stopTimer } from '@/features/time-tracking/services/time-tracking.service';
import { stopTimerSchema } from '@/features/time-tracking/validators/time-tracking.schema';

/** POST /api/time-tracking/stop — stop the running timer, regardless of which source started it. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { sessionId } = stopTimerSchema.parse(await request.json());
    const result = await stopTimer(ctx, new ObjectId(sessionId));

    return ok(
      {
        sessionId: result.session._id.toHexString(),
        durationSeconds: result.session.durationSeconds,
        totalTrackedSeconds: result.activity.totalTrackedSeconds,
      },
      'Timer stopped'
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
