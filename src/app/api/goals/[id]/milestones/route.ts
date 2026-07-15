import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { addMilestone, listMilestones } from '@/features/goals/services/milestones.service';
import { createMilestoneSchema } from '@/features/goals/validators/milestones.schema';
import { isValidObjectId } from '@/lib/mongo/object-id';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const items = await listMilestones(ctx, new ObjectId(id));
    return ok(items, 'Milestones');
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid goal id', 400);

    const input = createMilestoneSchema.parse(await request.json());
    const milestone = await addMilestone(ctx, new ObjectId(id), input);
    return ok(milestone, 'Milestone added', 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
