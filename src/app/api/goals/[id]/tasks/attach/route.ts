import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { attachTask } from '@/features/goals/services/goal-tasks.service';
import { attachGoalTaskSchema } from '@/features/goals/validators/goals.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = attachGoalTaskSchema.parse(await request.json());
    await attachTask(ctx, new ObjectId(id), new ObjectId(input.taskId));
    return ok(null, 'Task attached');
  } catch (error) {
    return handleRouteError(error);
  }
}
