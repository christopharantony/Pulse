import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env.server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookie-names';

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

function parseDurationSeconds(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) throw new Error(`Invalid duration string: ${input}`);
  const value = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return value * multipliers[match[2] as keyof typeof multipliers];
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: parseDurationSeconds(serverEnv.ACCESS_TOKEN_EXPIRES),
  });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: parseDurationSeconds(serverEnv.REFRESH_TOKEN_EXPIRES),
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
