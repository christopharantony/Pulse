import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import { requireWorkspace } from '@/features/workspace/services/require-workspace';
import { getHabitStatistics } from '@/features/habits/services/habits.service';
import { isValidObjectId } from '@/lib/mongo/object-id';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireWorkspace();
    if (!ctx) return fail('Not authenticated', 401);

    const { id } = await params;
    if (!isValidObjectId(id)) return fail('Invalid habit id', 400);

    const stats = await getHabitStatistics(ctx, new ObjectId(id));
    return ok(stats, 'Habit statistics');
  } catch (error) {
    return handleRouteError(error);
  }
}
