import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { updateGoalProgress } from '@/features/goals/services/goals.service';
import { updateGoalProgressSchema } from '@/features/goals/validators/goals.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** PATCH /api/goals/:id/progress — manual progress update (`currentValue` or `progressPct`). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = updateGoalProgressSchema.parse(await request.json());
    const goal = await updateGoalProgress(ctx, new ObjectId(id), input);
    return ok(goal, 'Goal progress updated');
  } catch (error) {
    return handleRouteError(error);
  }
}
