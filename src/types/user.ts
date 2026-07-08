import type { ObjectId } from 'mongodb';

// Extension point: append 'google' | 'github' | 'apple' etc. as OAuth providers are added.
export type AuthProvider = 'credentials';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  // null for OAuth-only accounts once OAuth providers are added.
  passwordHash: string | null;
  avatar: string | null;
  emailVerified: boolean;
  // Extension point: OAuth (Google/GitHub/Apple) — auth.service.ts would branch on this
  // for provider-specific lookup/creation instead of the credentials password flow.
  provider: AuthProvider;
  providerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
