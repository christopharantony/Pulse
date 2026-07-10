import type { NextRequest } from 'next/server';
import { resetPassword } from '@/features/auth/services/auth.service';
import { resetPasswordSchema } from '@/features/auth/validators/auth.schema';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { ok, handleRouteError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await request.json());
    await resetPassword(body.token, body.password);
    // Defensive: the requester might be viewing this from a tab that's still logged in.
    await clearAuthCookies();
    return ok(null, 'Password reset successfully');
  } catch (error) {
    return handleRouteError(error);
  }
}
