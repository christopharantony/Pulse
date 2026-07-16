import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { startTaskTimer } from '@/features/tasks/services/tasks.service';
import { startTaskTimerSchema } from '@/features/tasks/validators/tasks.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/tasks/:id/timer/start — start a live timer against a task. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid task id', 400);

    const input = startTaskTimerSchema.parse(await request.json().catch(() => ({})));
    const result = await startTaskTimer(ctx, new ObjectId(id), input);
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
