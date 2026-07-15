import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { reorderMilestones } from '@/features/goals/services/milestones.service';
import { reorderMilestonesSchema } from '@/features/goals/validators/milestones.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = reorderMilestonesSchema.parse(await request.json());
    const items = await reorderMilestones(
      ctx,
      new ObjectId(id),
      input.orderedIds.map((milestoneId) => new ObjectId(milestoneId))
    );
    return ok(items, 'Milestones reordered');
  } catch (error) {
    return handleRouteError(error);
  }
}
