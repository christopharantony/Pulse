import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { completeMilestone } from '@/features/goals/services/milestones.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id, milestoneId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(milestoneId)) return fail('Invalid id', 400);

    const milestone = await completeMilestone(ctx, new ObjectId(id), new ObjectId(milestoneId));
    return ok(milestone, 'Milestone completed');
  } catch (error) {
    return handleRouteError(error);
  }
}
