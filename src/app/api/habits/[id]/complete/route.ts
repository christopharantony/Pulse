import { ObjectId } from 'mongodb';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { completeHabitToday } from '@/features/habits/services/habits.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

/**
 * POST /api/habits/:id/complete — mark a habit done for today. Backs the dashboard's habit
 * quick-complete (optimistic on the client). Kept as a thin alias onto the generalised
 * `logHabitDay(ctx, id, {status:'completed'})` so the shipped dashboard widget's existing
 * optimistic mutation never breaks — `POST /api/habits/:id/log` is the full-featured endpoint new
 * clients should use for numeric/duration/checklist habits.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const habit = await completeHabitToday(ctx, new ObjectId(id));
    return ok(habit, 'Habit completed');
  } catch (error) {
    return handleRouteError(error);
  }
}
