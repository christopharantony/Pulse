import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';
import { recurrenceSchema, reminderSchema } from '@/schemas/schedulable.schema';

export const createCalendarEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(10_000).nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean().default(false),
    taskId: objectIdStringSchema.nullable().optional(),
    recurrence: recurrenceSchema.nullable().optional(),
    reminders: z.array(reminderSchema).optional(),
  })
  .refine((event) => event.endsAt >= event.startsAt, {
    message: 'End time must be at or after the start time',
    path: ['endsAt'],
  });
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().max(10_000).nullable(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean(),
    taskId: objectIdStringSchema.nullable(),
    recurrence: recurrenceSchema.nullable(),
    reminders: z.array(reminderSchema),
  })
  .partial();
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
