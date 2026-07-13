import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const startSessionSchema = z.object({
  activityId: objectIdStringSchema,
  note: z.string().max(1000).nullable().optional(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const stopSessionSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});
export type StopSessionInput = z.infer<typeof stopSessionSchema>;
