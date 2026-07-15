import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getHabitCalendar } from '@/features/habits/services/habits.service';
import { habitCalendarQuerySchema } from '@/features/habits/validators/habits.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

/** GET /api/habits/:id/calendar?from&to — day-state range for the calendar/heatmap view. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const query = habitCalendarQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const calendar = await getHabitCalendar(ctx, new ObjectId(id), query);
    return ok(calendar, 'Habit calendar');
  } catch (error) {
    return handleRouteError(error);
  }
}
