import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { createHabit, listHabits } from '@/features/habits/services/habits.service';
import { createHabitSchema, habitListQuerySchema } from '@/features/habits/validators/habits.schema';

/**
 * GET /api/habits — list habits with filters/sort/offset-pagination. Array-valued params
 * (`type`, `category`) are read via `getAll` so repeats survive `Object.fromEntries` collapsing
 * them to the last value, mirroring `GET /api/tasks`.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const sp = request.nextUrl.searchParams;
    const raw: Record<string, unknown> = Object.fromEntries(sp.entries());
    if (sp.has('type')) raw.type = sp.getAll('type');
    if (sp.has('category')) raw.category = sp.getAll('category');

    const query = habitListQuerySchema.parse(raw);
    const result = await listHabits(ctx, query);
    return ok(result, 'Habits');
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/habits — create a habit in the caller's workspace. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = createHabitSchema.parse(await request.json());
    const habit = await createHabit(ctx, input);
    return ok(habit, 'Habit created', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
