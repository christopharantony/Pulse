import { api } from '@/lib/axios';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '@/features/auth/validators/auth.schema';
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

export async function verifyEmailRequest(input: VerifyEmailInput): Promise<AuthUser> {
  const { data } = await api.post<ApiEnvelope<AuthUser>>('/auth/verify-email', input);
  return data.data;
}

export async function resendVerificationRequest(): Promise<void> {
  await api.post('/auth/resend-verification');
}

export async function forgotPasswordRequest(input: ForgotPasswordInput): Promise<void> {
  await api.post('/auth/forgot-password', input);
}

export async function resetPasswordRequest(input: ResetPasswordInput): Promise<void> {
  await api.post('/auth/reset-password', input);
}

export async function changePasswordRequest(input: ChangePasswordInput): Promise<void> {
  await api.post('/auth/change-password', input);
}
