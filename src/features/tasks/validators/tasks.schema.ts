import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';
import { schedulableSchema } from '@/schemas/schedulable.schema';

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
export const taskPrioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent']);

export const checklistItemSchema = z.object({
  title: z.string().min(1, 'Checklist item cannot be empty').max(500),
  done: z.boolean().default(false),
});

/**
 * The scheduling fields (dueDate/recurrence/reminders) come from the shared `schedulableSchema`
 * rather than being redeclared here — the same shape Habit/Goal/CalendarEvent reuse, so the four
 * schedulable entities can never drift.
 */
export const createTaskSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(500, 'Title is too long'),
    description: z.string().max(10_000).nullable().optional(),
    projectId: objectIdStringSchema.nullable().optional(),
    status: taskStatusSchema.default('todo'),
    priority: taskPrioritySchema.default('none'),
    tagIds: z.array(objectIdStringSchema).max(50).optional(),
    checklist: z.array(checklistItemSchema).max(200).optional(),
    assigneeId: objectIdStringSchema.nullable().optional(),
  })
  .merge(schedulableSchema);
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
