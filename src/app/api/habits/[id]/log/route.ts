import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { logHabitDay, undoHabitLog } from '@/features/habits/services/habits.service';
import { logHabitSchema } from '@/features/habits/validators/habits.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/habits/:id/log — the generalised daily log endpoint. Body shape varies by habit type
 * (boolean: `status`; numeric/duration: `value` or `deltaValue`; checklist: `checkedItemIds`).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const input = logHabitSchema.parse(await request.json().catch(() => ({})));
    const habit = await logHabitDay(ctx, new ObjectId(id), input);
    return ok(habit, 'Habit logged');
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/habits/:id/log?date=YYYY-MM-DD — undo a day's log (defaults to today). */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const dateParam = request.nextUrl.searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : undefined;
    const habit = await undoHabitLog(ctx, new ObjectId(id), date);
    return ok(habit, 'Habit log undone');
  } catch (error) {
    return handleRouteError(error);
  }
}
