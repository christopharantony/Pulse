import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { startStandaloneTimer, startTimerForActivity } from '@/features/time-tracking/services/time-tracking.service';
import {
  startActivityTimerSchema,
  startStandaloneTimerSchema,
} from '@/features/time-tracking/validators/time-tracking.schema';

/**
 * POST /api/time-tracking/start — the Time Tracker page's generic (non-goal/habit) start.
 * `{ activityId }` resumes an existing (linked or standalone) activity; `{ sourceType, title }`
 * creates a brand-new standalone one.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const body = await request.json();
    let result;
    if ('activityId' in body) {
      const input = startActivityTimerSchema.parse(body);
      result = await startTimerForActivity(ctx, new ObjectId(input.activityId), input.note);
    } else {
      result = await startStandaloneTimer(ctx, startStandaloneTimerSchema.parse(body));
    }

    return ok(
      {
        sessionId: result.session._id.toHexString(),
        activityId: result.activity._id.toHexString(),
        startedAt: result.session.startedAt.toISOString(),
        stoppedPreviousSessionId: result.stoppedPrevious ? result.stoppedPrevious._id.toHexString() : null,
      },
      'Timer started'
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
