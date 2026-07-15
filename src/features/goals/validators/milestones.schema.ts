import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = createMilestoneSchema.partial();
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const reorderMilestonesSchema = z.object({
  orderedIds: z.array(objectIdStringSchema).min(1),
});
export type ReorderMilestonesInput = z.infer<typeof reorderMilestonesSchema>;
