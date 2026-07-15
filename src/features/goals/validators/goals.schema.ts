import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';
import { offsetPaginationSchema, sortSchema } from '@/schemas/pagination.schema';

export const goalStatusSchema = z.enum(['not_started', 'active', 'on_hold', 'completed', 'cancelled', 'archived']);
export const goalPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const goalCategorySchema = z.enum([
  'personal',
  'career',
  'health',
  'finance',
  'learning',
  'business',
  'relationships',
  'custom',
]);
export const goalProgressMethodSchema = z.enum(['manual', 'milestone', 'task', 'habit', 'mixed']);
export const goalVisibilitySchema = z.enum(['private', 'workspace']);

export const createGoalSchema = z
  .object({
    title: z.string().min(1, 'Goal title is required').max(200),
    description: z.string().max(4000).nullable().optional(),
    icon: z.string().max(32).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
      .nullable()
      .optional(),
    category: goalCategorySchema.default('personal'),
    customCategoryLabel: z.string().max(50).nullable().optional(),
    status: goalStatusSchema.default('not_started'),
    priority: goalPrioritySchema.default('medium'),
    progressMethod: goalProgressMethodSchema.default('manual'),
    startDate: z.coerce.date().nullable().optional(),
    targetDate: z.coerce.date().nullable().optional(),
    targetValue: z.number().nullable().optional(),
    visibility: goalVisibilitySchema.default('workspace'),
    tagIds: z.array(objectIdStringSchema).max(50).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.category === 'custom' && !val.customCategoryLabel) {
      ctx.addIssue({
        code: 'custom',
        path: ['customCategoryLabel'],
        message: 'Required when category is custom',
      });
    }
  });
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

// `status` is never patchable through the generic update — all transitions go through
// `updateGoalStatus`/`completeGoal`/`archiveGoal`/`unarchiveGoal` so `completionDate`/`archivedAt`
// side effects always stay consistent (see goals.service.ts).
export const updateGoalSchema = createGoalSchema.innerType().omit({ status: true }).partial();
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const updateGoalProgressSchema = z
  .object({
    currentValue: z.number().optional(),
    progressPct: z.number().min(0).max(100).optional(),
  })
  .refine((val) => val.currentValue !== undefined || val.progressPct !== undefined, {
    message: 'currentValue or progressPct is required',
  });
export type UpdateGoalProgressInput = z.infer<typeof updateGoalProgressSchema>;

export const updateGoalStatusSchema = z.object({
  status: goalStatusSchema,
});
export type UpdateGoalStatusInput = z.infer<typeof updateGoalStatusSchema>;

export const attachGoalTaskSchema = z.object({
  taskId: objectIdStringSchema,
});
export type AttachGoalTaskInput = z.infer<typeof attachGoalTaskSchema>;

export const startGoalTimerSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});
export type StartGoalTimerInput = z.infer<typeof startGoalTimerSchema>;

export const stopGoalTimerSchema = z.object({
  sessionId: objectIdStringSchema,
});
export type StopGoalTimerInput = z.infer<typeof stopGoalTimerSchema>;

export const goalListQuerySchema = offsetPaginationSchema.merge(sortSchema).extend({
  status: z.array(goalStatusSchema).optional(),
  priority: z.array(goalPrioritySchema).optional(),
  category: z.array(goalCategorySchema).optional(),
  progressMin: z.coerce.number().min(0).max(100).optional(),
  progressMax: z.coerce.number().min(0).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  q: z.string().max(200).optional(),
  includeArchived: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});
export type GoalListQueryInput = z.infer<typeof goalListQuerySchema>;
