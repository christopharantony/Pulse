import 'server-only';
import type { ObjectId } from 'mongodb';
import { createRepository, type FindManyOptions } from '@/db/base-repository';
import { COLLECTIONS } from '@/db/collections';
import { withWorkspaceScope } from '@/lib/query/filter';
import type { PaginatedResult } from '@/lib/query/pagination';
import type { Recurrence } from '@/schemas/schedulable.schema';
import type { Habit } from '@/features/habits/types/habit';
import { habitLogsRepository } from '@/features/habits/repositories/habit-logs.repository';

const base = createRepository<Habit>({ collectionName: COLLECTIONS.habits });

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Longest and current consecutive-day streaks from a sorted, unique list of completed day-keys. */
function computeStreaks(days: Date[]): { current: number; longest: number } {
  if (days.length === 0) return { current: 0, longest: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = days[i].getTime() - days[i - 1].getTime();
    run = diff === ONE_DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return { current: run, longest };
}

async function create(
  workspaceId: ObjectId,
  createdBy: ObjectId,
  input: {
    name: string;
    description?: string | null;
    color?: string | null;
    recurrence: Recurrence;
    targetPerPeriod?: number | null;
  }
): Promise<Habit> {
  return base.insertOne({
    workspaceId,
    createdBy,
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? null,
    recurrence: input.recurrence,
    targetPerPeriod: input.targetPerPeriod ?? null,
    currentStreak: 0,
    longestStreak: 0,
    archivedAt: null,
  });
}

async function listByWorkspace(
  workspaceId: ObjectId,
  opts?: FindManyOptions & { includeArchived?: boolean }
): Promise<PaginatedResult<Habit>> {
  const filter = opts?.includeArchived ? {} : { archivedAt: null };
  return base.findMany(withWorkspaceScope(filter, workspaceId), opts);
}

async function setArchived(id: ObjectId, archived: boolean): Promise<Habit | null> {
  return base.updateById(id, { archivedAt: archived ? new Date() : null });
}

/**
 * Recompute and cache the streak counters from the habit's completed logs. A derived write — the
 * logs remain the source of truth; this only refreshes the denormalised cache on the Habit so the
 * UI can render streaks without an aggregation. Call after each log write.
 */
async function recomputeStreakCache(habitId: ObjectId): Promise<Habit | null> {
  const logs = await habitLogsRepository.listCompleted(habitId);
  const { current, longest } = computeStreaks(logs.map((log) => log.date));
  return base.updateById(habitId, { currentStreak: current, longestStreak: longest });
}

export const habitsRepository = {
  ...base,
  create,
  listByWorkspace,
  setArchived,
  recomputeStreakCache,
};
