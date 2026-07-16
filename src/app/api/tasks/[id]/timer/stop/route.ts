import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { stopTaskTimer } from '@/features/tasks/services/tasks.service';
import { stopTaskTimerSchema } from '@/features/tasks/validators/tasks.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/tasks/:id/timer/stop — stop the running timer and roll its duration into the task's Activity. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const input = stopTaskTimerSchema.parse(await request.json());
    const result = await stopTaskTimer(ctx, new ObjectId(id), new ObjectId(input.sessionId));
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
