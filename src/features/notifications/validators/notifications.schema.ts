import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const notificationTypeSchema = z.enum([
  'task_due',
  'habit_reminder',
  'goal_deadline',
  'mention',
  'system',
]);

export const createNotificationSchema = z.object({
  type: notificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(500),
  body: z.string().max(2000).nullable().optional(),
  entityType: z.string().max(50).nullable().optional(),
  entityId: objectIdStringSchema.nullable().optional(),
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
