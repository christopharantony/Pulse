import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { serverEnv } from '@/lib/env.server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth/cookie-names';

const accessSecret = new TextEncoder().encode(serverEnv.JWT_ACCESS_SECRET);

// URL path prefixes, not folder names — route groups like (dashboard) don't appear in the URL.
const PROTECTED_PREFIXES = ['/dashboard', '/settings'];

// This only verifies the access token's signature/expiry (Edge-safe, no DB call). It does NOT
// attempt a refresh here — that happens client-side via an axios response interceptor calling
// /api/auth/refresh, keeping this middleware simple per the "don't overcomplicate" requirement.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (payload.type !== 'access') {
      return redirectToLogin(request);
    }
    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
