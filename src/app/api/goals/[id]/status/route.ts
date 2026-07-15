import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { updateGoalStatus } from '@/features/goals/services/goals.service';
import { updateGoalStatusSchema } from '@/features/goals/validators/goals.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** POST /api/goals/:id/status — the one path for arbitrary status transitions (see goals.service.ts). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = updateGoalStatusSchema.parse(await request.json());
    const goal = await updateGoalStatus(ctx, new ObjectId(id), input.status);
    return ok(goal, 'Goal status updated');
  } catch (error) {
    return handleRouteError(error);
  }
}
