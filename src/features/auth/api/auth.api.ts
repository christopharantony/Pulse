import { api } from '@/lib/axios';
import type { RegisterInput, LoginInput } from '@/features/auth/validators/auth.schema';
import type { ApiEnvelope, AuthUser } from '@/features/auth/types';

export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const { data } = await api.post<ApiEnvelope<AuthUser>>('/auth/register', input);
  return data.data;
}

export async function loginRequest(input: LoginInput): Promise<AuthUser> {
  const { data } = await api.post<ApiEnvelope<AuthUser>>('/auth/login', input);
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<ApiEnvelope<AuthUser>>('/auth/me');
  return data.data;
}
