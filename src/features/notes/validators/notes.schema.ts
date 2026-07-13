import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  body: z.string().max(1_000_000).default(''),
  plainText: z.string().max(1_000_000).optional(),
  projectId: objectIdStringSchema.nullable().optional(),
  taskId: objectIdStringSchema.nullable().optional(),
  goalId: objectIdStringSchema.nullable().optional(),
  tagIds: z.array(objectIdStringSchema).max(50).optional(),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = createNoteSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
