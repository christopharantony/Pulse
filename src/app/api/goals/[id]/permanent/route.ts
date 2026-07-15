import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { permanentlyDeleteGoal } from '@/features/goals/services/goals.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    await permanentlyDeleteGoal(ctx, new ObjectId(id));
    return ok(null, 'Goal permanently deleted');
  } catch (error) {
    return handleRouteError(error);
  }
}
