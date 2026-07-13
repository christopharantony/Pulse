import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const activitySourceTypeSchema = z.enum([
  'task',
  'habit',
  'goal',
  'calendar_event',
  'quick_focus',
  'custom',
]);

/** Input for starting a timer against an existing source (task/habit/goal/calendar event). */
export const linkedActivitySchema = z.object({
  sourceType: z.enum(['task', 'habit', 'goal', 'calendar_event']),
  sourceId: objectIdStringSchema,
});
export type LinkedActivityInput = z.infer<typeof linkedActivitySchema>;

/** Input for a standalone activity (quick focus session or user-defined custom activity). */
export const standaloneActivitySchema = z.object({
  sourceType: z.enum(['quick_focus', 'custom']),
  title: z.string().min(1, 'A title is required').max(200),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
    .nullable()
    .optional(),
});
export type StandaloneActivityInput = z.infer<typeof standaloneActivitySchema>;
