import { fail, handleRouteError, ok } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { listTrash } from '@/features/habits/services/habits.service';

export async function GET() {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const items = await listTrash(ctx);
    return ok(items, 'Trash');
  } catch (error) {
    return handleRouteError(error);
  }
}
