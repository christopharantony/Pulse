import { isAxiosError } from 'axios';
import type { ApiErrorEnvelope } from '@/features/auth/types';

export function extractApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError<ApiErrorEnvelope>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return fallback;
}

export function extractApiFieldErrors(error: unknown): Record<string, string[]> | null {
  if (isAxiosError<ApiErrorEnvelope>(error) && error.response?.data?.errors) {
    return error.response.data.errors;
  }
  return null;
}
