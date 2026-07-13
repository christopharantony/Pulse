import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const goalStatusSchema = z.enum(['active', 'completed', 'archived']);

export const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(200),
  description: z.string().max(4000).nullable().optional(),
  status: goalStatusSchema.default('active'),
  targetDate: z.coerce.date().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  tagIds: z.array(objectIdStringSchema).max(50).optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema
  .extend({ currentValue: z.number() })
  .partial();
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
