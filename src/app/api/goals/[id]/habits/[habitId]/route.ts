import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { unlinkHabit, updateHabitContribution } from '@/features/goals/services/goal-habits.service';
import { updateGoalHabitLinkSchema } from '@/features/goals/validators/goal-habit-links.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

type Params = { params: Promise<{ id: string; habitId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, habitId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(habitId)) return fail('Invalid id', 400);

    const input = updateGoalHabitLinkSchema.parse(await request.json());
    const link = await updateHabitContribution(ctx, new ObjectId(id), new ObjectId(habitId), input);
    return ok(link, 'Contribution updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, habitId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(habitId)) return fail('Invalid id', 400);

    await unlinkHabit(ctx, new ObjectId(id), new ObjectId(habitId));
    return ok(null, 'Habit unlinked');
  } catch (error) {
    return handleRouteError(error);
  }
}
