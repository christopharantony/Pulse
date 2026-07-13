import { ObjectId } from 'mongodb';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { completeHabitToday } from '@/features/habits/services/habits.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

/**
 * POST /api/habits/:id/complete — mark a habit done for today. Backs the dashboard's habit
 * quick-complete (optimistic on the client). Idempotent per day; returns the refreshed streak.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const result = await completeHabitToday(ctx, new ObjectId(id));
    return ok(result, 'Habit completed');
  } catch (error) {
    return handleRouteError(error);
  }
}
