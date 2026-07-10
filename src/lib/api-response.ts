import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from '@/features/auth/services/auth.service';

export function ok<T>(data: T, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function fail(message: string, status = 400, errors: Record<string, string[]> | null = null) {
  return NextResponse.json({ success: false, message, errors }, { status });
}

const authErrorStatus: Record<AuthError['code'], number> = {
  EMAIL_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  INVALID_SESSION: 401,
  INVALID_TOKEN: 400,
  TOKEN_REUSE: 401,
};

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return fail('Validation failed', 422, error.flatten().fieldErrors as Record<string, string[]>);
  }
  if (error instanceof AuthError) {
    return fail(error.message, authErrorStatus[error.code]);
  }
  console.error('Unhandled route error:', error);
  return fail('Something went wrong. Please try again.', 500);
}
