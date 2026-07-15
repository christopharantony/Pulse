import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { linkHabit } from '@/features/goals/services/goal-habits.service';
import { linkGoalHabitSchema } from '@/features/goals/validators/goal-habit-links.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = linkGoalHabitSchema.parse(await request.json());
    const link = await linkHabit(ctx, new ObjectId(id), new ObjectId(input.habitId), {
      contributionType: input.contributionType,
      contributionWeight: input.contributionWeight,
    });
    return ok(link, 'Habit linked', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
