import type { ObjectId } from 'mongodb';
import type { Recurrence } from '@/schemas/schedulable.schema';

export type HabitType = 'boolean' | 'numeric' | 'duration' | 'checklist';

/** A single item on a checklist habit's daily list (e.g. "Brush Teeth" on "Morning Routine"). */
export interface HabitChecklistItem {
  /** Stable client-safe id (nanoid-style) — embedded, never queried standalone. */
  id: string;
  name: string;
  order: number;
}

/** A wall-clock reminder time. Habit-local shape, not `schedulableSchema.reminders` — see habits.schema.ts. */
export interface HabitReminder {
  /** 'HH:mm', evaluated in the workspace's timezone. */
  timeOfDay: string;
  enabled: boolean;
}

/** Labels which unit `currentStreak`/`longestStreak` are counted in. */
export type HabitStreakUnit = 'day' | 'period';

/**
 * A recurring commitment tracked by completion streaks (distinct from a Task's done/not-done).
 * Four types share this one flat shape (nullable type-specific fields) rather than a discriminated
 * union, matching Task's existing style and the codebase's `.partial()`-based update pattern.
 *
 * `currentStreak`/`longestStreak`/`consistencyScore` are a denormalised cache recomputed by the
 * service layer from `habit_logs` — never trusted from client input. The logs collection is the
 * source of truth. `lastLoggedDayKey`/`streakAnchorDayKey` are the incremental-recompute cursor
 * (see habits.service.ts) that lets the hot "log today" path avoid a full-history scan.
 */
export interface Habit {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  /** Emoji or icon-key; freeform, UI-validated only. */
  icon: string | null;
  /** Freeform grouping tag, not an enum — "Custom Categories" falls out for free. */
  category: string | null;

  /** Immutable after creation — never patchable via updateHabitSchema. */
  type: HabitType;
  recurrence: Recurrence;
  /** Day-keys; when non-empty, overrides `recurrence` entirely (see habit-schedule.ts). */
  specificDates: Date[] | null;
  /** Scheduling/streak anchor; null means `createdAt` is the anchor. */
  startDate: Date | null;
  /** Optional habit end (distinct from `recurrence.endDate`, which only bounds the repeat rule). */
  endDate: Date | null;
  /** "N scheduled days satisfied per period" — drives period-based (e.g. weekly) streaks. */
  targetPerPeriod: number | null;

  /** Required for numeric/duration habits; null otherwise. */
  targetValue: number | null;
  /** Free text for numeric (e.g. "L", "steps"); always "minutes" for duration. */
  unit: string | null;
  /** Required for checklist habits (embedded, bounded — Subtask precedent); null otherwise. */
  checklistItems: HabitChecklistItem[] | null;

  reminders: HabitReminder[];

  currentStreak: number;
  longestStreak: number;
  streakUnit: HabitStreakUnit;
  /** 0-100 EWMA, distinct from Completion % — see habits.service.ts. */
  consistencyScore: number;
  lastLoggedDayKey: Date | null;
  streakAnchorDayKey: Date | null;
  /** Reserved seam for a future "Grace Day" feature; always 0 in Phase 8. */
  graceDaysAllowed: number;
  /** Reserved seam for a future "Grace Day" feature; always 0 in Phase 8. */
  graceDaysUsedInCurrentStreak: number;

  createdBy: ObjectId;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
