import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';
import { schedulableSchema } from '@/schemas/schedulable.schema';
import { offsetPaginationSchema, sortSchema } from '@/schemas/pagination.schema';

export const taskStatusSchema = z.enum([
  'inbox',
  'todo',
  'in_progress',
  'waiting',
  'completed',
  'cancelled',
  'archived',
]);
export const taskPrioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent']);

/** Bounds enforced at the schema level for the recursive subtask tree (product-bounded, not by nature). */
export const MAX_SUBTASK_DEPTH = 5;
export const MAX_SUBTASK_COUNT = 200;

export interface SubtaskInput {
  title: string;
  completed: boolean;
  order: number;
  children: SubtaskInput[];
}

function subtaskInputSchemaAtDepth(depth: number): z.ZodType<SubtaskInput> {
  return z.object({
    title: z.string().min(1, 'Subtask title is required').max(500),
    completed: z.boolean().default(false),
    order: z.number().default(0),
    children:
      depth >= MAX_SUBTASK_DEPTH
        ? z.array(z.never()).max(0).default([])
        : z.lazy(() => z.array(subtaskInputSchemaAtDepth(depth + 1)).max(MAX_SUBTASK_COUNT).default([])),
  }) as z.ZodType<SubtaskInput>;
}

export const subtaskInputSchema = subtaskInputSchemaAtDepth(0);

/**
 * The scheduling fields (dueDate/recurrence/reminders) come from the shared `schedulableSchema`
 * rather than being redeclared here — the same shape Habit/Goal/CalendarEvent reuse, so the four
 * schedulable entities can never drift.
 */
export const createTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
    description: z.string().max(10_000).nullable().optional(),
    notes: z.string().max(10_000).nullable().optional(),
    projectId: objectIdStringSchema.nullable().optional(),
    goalId: objectIdStringSchema.nullable().optional(),
    status: taskStatusSchema.default('inbox'),
    priority: taskPrioritySchema.default('none'),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
      .nullable()
      .optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueHasTime: z.boolean().default(false),
    estimatedMinutes: z.number().int().min(0).max(24 * 60 * 30).nullable().optional(),
    tagIds: z.array(objectIdStringSchema).max(50).optional(),
    subtasks: z.array(subtaskInputSchema).max(MAX_SUBTASK_COUNT).optional(),
    assigneeId: objectIdStringSchema.nullable().optional(),
  })
  .merge(schedulableSchema);
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({ status: taskStatusSchema, order: z.number() });
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const reorderTaskSchema = z.object({ order: z.number() });
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;

export const duplicateTaskSchema = z.object({ title: z.string().min(1).max(500).optional() }).optional();
export type DuplicateTaskInput = z.infer<typeof duplicateTaskSchema>;

export const unarchiveTaskSchema = z.object({ status: taskStatusSchema.optional() }).optional();
export type UnarchiveTaskInput = z.infer<typeof unarchiveTaskSchema>;

export const bulkTaskIdsSchema = z.object({ ids: z.array(objectIdStringSchema).min(1).max(200) });
export type BulkTaskIdsInput = z.infer<typeof bulkTaskIdsSchema>;

export const bulkUpdateTaskSchema = bulkTaskIdsSchema.extend({
  patch: z.object({
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    projectId: objectIdStringSchema.nullable().optional(),
    tagIds: z.array(objectIdStringSchema).optional(),
  }),
});
export type BulkUpdateTaskInput = z.infer<typeof bulkUpdateTaskSchema>;

export const taskListQuerySchema = offsetPaginationSchema.merge(sortSchema).extend({
  status: z.array(taskStatusSchema).optional(),
  priority: z.array(taskPrioritySchema).optional(),
  tagIds: z.array(objectIdStringSchema).optional(),
  projectId: objectIdStringSchema.optional(),
  goalId: objectIdStringSchema.optional(),
  q: z.string().max(200).optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  hasDueDate: z.coerce.boolean().optional(),
  hasSubtasks: z.coerce.boolean().optional(),
  isRecurring: z.coerce.boolean().optional(),
  includeArchived: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
});
export type TaskListQueryInput = z.infer<typeof taskListQuerySchema>;

export const startTaskTimerSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
});
export type StartTaskTimerInput = z.infer<typeof startTaskTimerSchema>;

export const stopTaskTimerSchema = z.object({
  sessionId: objectIdStringSchema,
});
export type StopTaskTimerInput = z.infer<typeof stopTaskTimerSchema>;
