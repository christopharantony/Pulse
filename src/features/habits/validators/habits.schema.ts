import { z } from 'zod';
import { recurrenceSchema } from '@/schemas/schedulable.schema';

export const createHabitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
    .nullable()
    .optional(),
  // Reuses the shared recurrence shape — the same one Task/Goal/CalendarEvent use.
  recurrence: recurrenceSchema,
  targetPerPeriod: z.number().int().min(1).nullable().optional(),
});
export type CreateHabitInput = z.infer<typeof createHabitSchema>;

export const updateHabitSchema = createHabitSchema.partial();
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

export const habitLogStatusSchema = z.enum(['completed', 'skipped']);

export const logHabitSchema = z.object({
  date: z.coerce.date(),
  status: habitLogStatusSchema.default('completed'),
});
export type LogHabitInput = z.infer<typeof logHabitSchema>;
