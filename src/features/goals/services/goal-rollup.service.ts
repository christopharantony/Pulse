import 'server-only';
import { type Filter, type ObjectId } from 'mongodb';
import { goalsRepository } from '@/features/goals/repositories/goals.repository';
import { goalProgressSnapshotsRepository } from '@/features/goals/repositories/goal-progress-snapshots.repository';
import { computeProgressPct } from '@/features/goals/services/goals.service';
import type { Goal } from '@/features/goals/types/goal';
import { workspaceRepository } from '@/features/workspace/repositories/workspace.repository';
import type { Workspace } from '@/features/workspace/types/workspace';
import { zonedDayKey } from '@/lib/time/day';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute and persist one goal's progress snapshot for a day. Mirrors `rollup.service.ts`'s
 * `rollupDay` — idempotent per `{goalId, date}`, safe to re-run. Reads the live `Goal` document
 * (already-cached `currentValue`/`progressMethod`), not raw event data, since `Goal.currentValue`
 * is itself kept current by `goal-progress.service.ts`'s recompute triggers.
 */
export async function rollupGoalProgressForDay(input: {
  workspaceId: ObjectId;
  goalId: ObjectId;
  timezone: string;
  dayInstant: Date;
}): Promise<void> {
  const goal = await goalsRepository.findById(input.goalId);
  if (!goal) return;

  await goalProgressSnapshotsRepository.upsertForDay({
    workspaceId: goal.workspaceId,
    goalId: goal._id,
    date: zonedDayKey(input.dayInstant, input.timezone),
    progressPct: computeProgressPct(goal),
    currentValue: goal.currentValue,
    method: goal.progressMethod,
  });
}

/**
 * Roll up *yesterday* for every non-deleted goal across every workspace, using each workspace's
 * timezone. Intended to be invoked once nightly by the internal cron route, alongside the existing
 * task/habit rollup. A full scan is fine at MVP scale, matching `runRollupsForYesterday`'s own
 * documented trade-off.
 */
export async function runGoalRollupsForYesterday(): Promise<{ processed: number }> {
  const workspacesCollection = await workspaceRepository.collection();
  const workspaces = (await workspacesCollection.find({}).toArray()) as Workspace[];
  const goalsCollection = await goalsRepository.collection();
  const yesterday = new Date(Date.now() - MS_PER_DAY);
  let processed = 0;

  for (const workspace of workspaces) {
    const goals = (await goalsCollection
      .find({ workspaceId: workspace._id, deletedAt: null } as Filter<Goal>)
      .toArray()) as Goal[];

    for (const goal of goals) {
      await rollupGoalProgressForDay({
        workspaceId: workspace._id,
        goalId: goal._id,
        timezone: workspace.settings.timezone,
        dayInstant: yesterday,
      });
      processed += 1;
    }
  }

  return { processed };
}
