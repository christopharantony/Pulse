import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { deleteMilestone, updateMilestone } from '@/features/goals/services/milestones.service';
import { updateMilestoneSchema } from '@/features/goals/validators/milestones.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

type Params = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, milestoneId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(milestoneId)) return fail('Invalid id', 400);

    const input = updateMilestoneSchema.parse(await request.json());
    const milestone = await updateMilestone(ctx, new ObjectId(id), new ObjectId(milestoneId), input);
    return ok(milestone, 'Milestone updated');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, milestoneId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(milestoneId)) return fail('Invalid id', 400);

    await deleteMilestone(ctx, new ObjectId(id), new ObjectId(milestoneId));
    return ok(null, 'Milestone deleted');
  } catch (error) {
    return handleRouteError(error);
  }
}
