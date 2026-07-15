import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { deleteGoal, getGoalDetail, updateGoal } from '@/features/goals/services/goals.service';
import { updateGoalSchema } from '@/features/goals/validators/goals.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const goal = await getGoalDetail(ctx, new ObjectId(id));
    return ok(goal, 'Goal');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = updateGoalSchema.parse(await request.json());
    const goal = await updateGoal(ctx, new ObjectId(id), input);
    return ok(goal, 'Goal updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    await deleteGoal(ctx, new ObjectId(id));
    return ok(null, 'Goal moved to trash');
  } catch (error) {
    return handleRouteError(error);
  }
}
