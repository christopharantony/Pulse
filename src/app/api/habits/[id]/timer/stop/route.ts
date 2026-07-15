import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { stopHabitTimer } from '@/features/habits/services/habits.service';
import { stopHabitTimerSchema } from '@/features/habits/validators/habits.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/habits/:id/timer/stop — stop the running timer and roll elapsed minutes into today's log. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const input = stopHabitTimerSchema.parse(await request.json());
    const result = await stopHabitTimer(ctx, new ObjectId(id), new ObjectId(input.sessionId));
    return ok(
      {
        sessionId: result.session._id.toHexString(),
        durationSeconds: result.session.durationSeconds,
        totalTrackedSeconds: result.activity.totalTrackedSeconds,
        habit: result.habit,
      },
      'Timer stopped'
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
