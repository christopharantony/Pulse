import type { NextRequest } from 'next/server';
import { fail, handleRouteError, ok } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { searchGoals } from '@/features/goals/services/goals.service';

/** GET /api/goals/search?q= — `q`-only convenience alias for `GET /api/goals?q=`. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const q = request.nextUrl.searchParams.get('q') ?? '';
    const limitParam = request.nextUrl.searchParams.get('limit');
    const items = await searchGoals(ctx, q, { limit: limitParam ? Number(limitParam) : undefined });
    return ok(items, 'Search results');
  } catch (error) {
    return handleRouteError(error);
  }
}
