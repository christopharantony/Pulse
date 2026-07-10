// Client-facing shape of a user: SafeUser's _id/Date fields serialize to strings over JSON.
export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  emailVerified: boolean;
  provider: string;
  providerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDto {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  message: string;
  errors: Record<string, string[]> | null;
}
