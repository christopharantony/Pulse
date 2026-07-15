import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { createGoal, listGoals } from '@/features/goals/services/goals.service';
import { createGoalSchema, goalListQuerySchema } from '@/features/goals/validators/goals.schema';

/**
 * GET /api/goals — list goals with filters/sort/offset-pagination. Array-valued params
 * (`status`, `priority`, `category`) are read via `getAll` so repeats survive
 * `Object.fromEntries` collapsing them to the last value, mirroring `GET /api/habits`.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const sp = request.nextUrl.searchParams;
    const raw: Record<string, unknown> = Object.fromEntries(sp.entries());
    if (sp.has('status')) raw.status = sp.getAll('status');
    if (sp.has('priority')) raw.priority = sp.getAll('priority');
    if (sp.has('category')) raw.category = sp.getAll('category');

    const query = goalListQuerySchema.parse(raw);
    const result = await listGoals(ctx, query);
    return ok(result, 'Goals');
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/goals — create a goal in the caller's workspace. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const input = createGoalSchema.parse(await request.json());
    const goal = await createGoal(ctx, input);
    return ok(goal, 'Goal created', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
