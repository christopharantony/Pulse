import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';
import { standaloneActivitySchema } from '@/features/activity/validators/activity.schema';

export const startSessionSchema = z.object({
  activityId: objectIdStringSchema,
  note: z.string().max(1000).nullable().optional(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const stopSessionSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});
export type StopSessionInput = z.infer<typeof stopSessionSchema>;

/** Time Tracker page: resume an existing (linked or standalone) activity. */
export const startActivityTimerSchema = z.object({
  activityId: objectIdStringSchema,
  note: z.string().max(1000).nullable().optional(),
});
export type StartActivityTimerInput = z.infer<typeof startActivityTimerSchema>;

/** Time Tracker page: start a brand-new ad-hoc (quick focus / custom) activity. */
export const startStandaloneTimerSchema = standaloneActivitySchema.extend({
  note: z.string().max(1000).nullable().optional(),
});
export type StartStandaloneTimerInput = z.infer<typeof startStandaloneTimerSchema>;

export const stopTimerSchema = z.object({
  sessionId: objectIdStringSchema,
  note: z.string().max(1000).nullable().optional(),
});
export type StopTimerInput = z.infer<typeof stopTimerSchema>;

export const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(31).default(10),
});
export type HistoryQueryInput = z.infer<typeof historyQuerySchema>;
