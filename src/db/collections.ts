/**
 * Single source of truth for every MongoDB collection name in Pulse.
 *
 * Repositories reference collections through this registry rather than hard-coding string
 * literals, so a rename happens in exactly one place and typos become compile errors.
 * The existing auth collections (users, sessions, tokens, rate limiter) are included so the
 * whole application shares one authoritative list.
 */
export const COLLECTIONS = {
  // Identity & auth (pre-existing — see src/db/client.ts).
  users: 'users',
  sessions: 'sessions',
  emailVerificationTokens: 'email_verification_tokens',
  passwordResetTokens: 'password_reset_tokens',
  rateLimitAttempts: 'rate_limit_attempts',

  // Tenancy.
  workspaces: 'workspaces',
  workspaceMembers: 'workspace_members',
  workspaceInvitations: 'workspace_invitations',

  // Core productivity domains.
  projects: 'projects',
  tasks: 'tasks',
  taskComments: 'task_comments',
  taskActivity: 'task_activity',
  habits: 'habits',
  habitLogs: 'habit_logs',
  goals: 'goals',

  // Activity Engine (the central time-tracking domains).
  activities: 'activities',
  timeSessions: 'time_sessions',

  // Supporting domains.
  calendarEvents: 'calendar_events',
  notes: 'notes',
  tags: 'tags',
  notifications: 'notifications',
  analyticsDailyRollups: 'analytics_daily_rollups',
} as const;

/** A valid MongoDB collection name, derived from the {@link COLLECTIONS} registry. */
export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
