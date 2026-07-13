import 'server-only';
import type { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspace } from '@/features/workspace/services/workspace.service';

/**
 * The resolved tenancy + identity context every workspace-scoped route operates in. Combines the
 * authenticated user (from the access-token cookie) with their active workspace and the settings
 * the dashboard's day-boundary math needs. This is the single place tenant resolution happens, so
 * no route hand-rolls a `workspaceId` lookup.
 */
export interface WorkspaceContext {
  userId: ObjectId;
  sessionId: string;
  workspaceId: ObjectId;
  timezone: string;
  /** 0=Sunday .. 6=Saturday. */
  weekStartsOn: number;
}

/**
 * Resolve the caller's identity and active workspace, or `null` when unauthenticated. Route handlers
 * call this first and return `fail('Not authenticated', 401)` on `null`, exactly as they use
 * `requireAuth()` today — this just adds the workspace layer on top.
 */
export async function requireWorkspace(): Promise<WorkspaceContext | null> {
  const auth = await requireAuth();
  if (!auth) return null;

  const workspace = await getActiveWorkspace(auth.userId);
  return {
    userId: auth.userId,
    sessionId: auth.sessionId,
    workspaceId: workspace._id,
    timezone: workspace.settings.timezone,
    weekStartsOn: workspace.settings.weekStartsOn,
  };
}
