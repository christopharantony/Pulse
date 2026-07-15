import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { startGoalTimer } from '@/features/goals/services/goals.service';
import { startGoalTimerSchema } from '@/features/goals/validators/goals.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/goals/:id/timer/start — start a live timer against a goal. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = startGoalTimerSchema.parse(await request.json().catch(() => ({})));
    const result = await startGoalTimer(ctx, new ObjectId(id), input);
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
