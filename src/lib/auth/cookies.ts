import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env.server';
import { parseDurationSeconds } from '@/lib/duration';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookie-names';

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  options?: { rememberMe?: boolean }
): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: parseDurationSeconds(serverEnv.ACCESS_TOKEN_EXPIRES),
  });

  // "Remember me": a long-lived persistent cookie. Otherwise omit maxAge entirely so the
  // refresh cookie is a browser-session cookie, cleared when the browser closes — the DB-side
  // Session.expiresAt still enforces the real server-side cap either way.
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    ...(options?.rememberMe
      ? { maxAge: parseDurationSeconds(serverEnv.REMEMBER_ME_REFRESH_EXPIRES) }
      : {}),
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}
