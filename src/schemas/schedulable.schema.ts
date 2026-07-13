import { z } from 'zod';

/**
 * The shared "Schedulable" shape reused by Task, Habit, Goal, and CalendarEvent (architecture doc
 * Section 3). MongoDB cannot enforce a shared sub-schema across collections, so this reuse is
 * enforced here at the application layer — every schedulable entity composes these schemas rather
 * than redefining recurrence/reminder fields and risking drift.
 */

export const recurrenceFrequencySchema = z.enum([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;

export const recurrenceCompletionBehaviorSchema = z.enum(['fixed', 'rolling']);
export type RecurrenceCompletionBehavior = z.infer<typeof recurrenceCompletionBehaviorSchema>;

export const recurrenceSchema = z.object({
  frequency: recurrenceFrequencySchema,
  /** Repeat every N periods of `frequency` (e.g. interval 2 + weekly = every other week). */
  interval: z.number().int().min(1, 'Interval must be at least 1').default(1),
  /** 0=Sunday..6=Saturday; only meaningful for weekly frequency. */
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  /** When the recurrence stops; null/absent means it repeats indefinitely. */
  endDate: z.coerce.date().nullable().optional(),
  /**
   * `fixed` (default): the next occurrence is computed from the original due date regardless of
   * how late completion happened — prevents drift on a missed occurrence. `rolling`: computed from
   * the actual completion timestamp — the next occurrence intentionally shifts with real behavior.
   */
  completionBehavior: recurrenceCompletionBehaviorSchema.default('fixed'),
});
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const reminderSchema = z.object({
  /** Minutes before the due/start time to fire the reminder (may be 0 or negative). */
  offsetMinutes: z.number().int(),
});
export type Reminder = z.infer<typeof reminderSchema>;

export const schedulableSchema = z.object({
  dueDate: z.coerce.date().nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  reminders: z.array(reminderSchema).optional(),
});
export type Schedulable = z.infer<typeof schedulableSchema>;
