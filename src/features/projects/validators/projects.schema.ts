import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Name is too long'),
  description: z.string().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
    .nullable()
    .optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema
  .extend({ isArchived: z.boolean() })
  .partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
