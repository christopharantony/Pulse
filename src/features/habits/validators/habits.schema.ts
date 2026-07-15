import { z } from 'zod';
import { recurrenceSchema } from '@/schemas/schedulable.schema';
import { offsetPaginationSchema, sortSchema } from '@/schemas/pagination.schema';

export const habitTypeSchema = z.enum(['boolean', 'numeric', 'duration', 'checklist']);

export const MAX_CHECKLIST_ITEMS = 20;
export const MAX_REMINDERS = 5;
export const MAX_SPECIFIC_DATES = 366;

export const habitChecklistItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  order: z.number().int().min(0),
});

export const habitReminderSchema = z.object({
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm'),
  enabled: z.boolean().default(true),
});

/**
 * Habit's own scheduling shape: it composes `recurrenceSchema` from the shared `Schedulable`
 * family, but deliberately NOT `reminderSchema` (offset-from-due-date) — a habit has no `dueDate`
 * instant to offset from, so reminders are wall-clock `HabitReminder`s instead (see habit.ts).
 * `specificDates`, when non-empty, overrides `recurrence` entirely (see habit-schedule.ts).
 */
export const createHabitSchema = z
  .object({
    name: z.string().min(1, 'Habit name is required').max(200),
    description: z.string().max(2000).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
      .nullable()
      .optional(),
    icon: z.string().max(32).nullable().optional(),
    category: z.string().max(50).nullable().optional(),

    type: habitTypeSchema,
    recurrence: recurrenceSchema,
    specificDates: z.array(z.coerce.date()).max(MAX_SPECIFIC_DATES).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    targetPerPeriod: z.number().int().min(1).nullable().optional(),

    targetValue: z.number().positive().nullable().optional(),
    unit: z.string().max(20).nullable().optional(),
    checklistItems: z.array(habitChecklistItemSchema).max(MAX_CHECKLIST_ITEMS).nullable().optional(),

    reminders: z.array(habitReminderSchema).max(MAX_REMINDERS).optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.type === 'numeric' || val.type === 'duration') && val.targetValue == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetValue'],
        message: 'Required for numeric/duration habits',
      });
    }
    if (val.type === 'checklist' && (!val.checklistItems || val.checklistItems.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['checklistItems'],
        message: 'Required for checklist habits',
      });
    }
    if (val.recurrence.frequency === 'none' && (!val.specificDates || val.specificDates.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['specificDates'],
        message: 'Required when recurrence frequency is none',
      });
    }
  });
export type CreateHabitInput = z.infer<typeof createHabitSchema>;

// `type` is immutable after creation — omitted entirely, not just optional, so a client can never
// even attempt to patch it (the service layer also never reads it from the update payload).
export const updateHabitSchema = createHabitSchema.innerType().omit({ type: true }).partial();
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

export const habitLogStatusSchema = z.enum(['completed', 'skipped', 'partial', 'missed']);

/**
 * Generalised daily log input — replaces the boolean-only `logHabitSchema` the scaffold shipped
 * with. `value`/`checkedItemIds` are interpreted by habit type in habits.service.ts; a boolean
 * habit only ever needs `status`.
 */
export const logHabitSchema = z.object({
  date: z.coerce.date().optional(),
  status: habitLogStatusSchema.optional(),
  /** numeric/duration: absolute value to set for the day (use `deltaValue` to increment instead). */
  value: z.number().min(0).optional(),
  /** numeric/duration: amount to add to today's logged value (e.g. from a timer stop or "+1 glass"). */
  deltaValue: z.number().optional(),
  /** checklist: full set of checked item ids for the day. */
  checkedItemIds: z.array(z.string()).optional(),
});
export type LogHabitInput = z.infer<typeof logHabitSchema>;

export const habitListQuerySchema = offsetPaginationSchema.merge(sortSchema).extend({
  type: z.array(habitTypeSchema).optional(),
  category: z.array(z.string()).optional(),
  q: z.string().max(200).optional(),
  includeArchived: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});
export type HabitListQueryInput = z.infer<typeof habitListQuerySchema>;

export const habitCalendarQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type HabitCalendarQueryInput = z.infer<typeof habitCalendarQuerySchema>;

export const startHabitTimerSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});
export type StartHabitTimerInput = z.infer<typeof startHabitTimerSchema>;

export const stopHabitTimerSchema = z.object({
  sessionId: z.string().min(1),
});
export type StopHabitTimerInput = z.infer<typeof stopHabitTimerSchema>;
