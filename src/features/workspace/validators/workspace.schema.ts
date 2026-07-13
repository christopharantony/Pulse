import { z } from 'zod';
import { objectIdStringSchema } from '@/schemas/object-id.schema';

/**
 * Workspace / membership / invitation input schemas. Shared between any future client form and
 * server route handler so validation never drifts (mirrors the auth-schema convention).
 */

export const workspaceSettingsSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required').default('UTC'),
  weekStartsOn: z.number().int().min(0).max(6).default(1),
});
export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Name is too long'),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  settings: workspaceSettingsSchema.optional(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(100),
    settings: workspaceSettingsSchema,
  })
  .partial();
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const workspaceRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);

export const addMemberSchema = z.object({
  userId: objectIdStringSchema,
  role: workspaceRoleSchema.default('member'),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const createInvitationSchema = z.object({
  email: z.string().email('A valid email is required'),
  role: workspaceRoleSchema.default('member'),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
