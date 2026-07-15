import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const goalHabitContributionTypeSchema = z.enum(['count', 'value']);

export const linkGoalHabitSchema = z.object({
  habitId: objectIdStringSchema,
  contributionType: goalHabitContributionTypeSchema.default('count'),
  contributionWeight: z.number().positive().default(1),
});
export type LinkGoalHabitInput = z.infer<typeof linkGoalHabitSchema>;

export const updateGoalHabitLinkSchema = z.object({
  contributionType: goalHabitContributionTypeSchema.optional(),
  contributionWeight: z.number().positive().optional(),
});
export type UpdateGoalHabitLinkInput = z.infer<typeof updateGoalHabitLinkSchema>;
