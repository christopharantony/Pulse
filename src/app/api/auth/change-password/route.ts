import type { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { changePassword } from '@/features/auth/services/auth.service';
import { changePasswordSchema } from '@/features/auth/validators/auth.schema';
import { requireAuth } from '@/lib/auth/require-auth';
import { ok, fail, handleRouteError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return fail('Not authenticated', 401);
    }

    const body = changePasswordSchema.parse(await request.json());
    await changePassword(
      auth.userId,
      body.currentPassword,
      body.newPassword,
      new ObjectId(auth.sessionId)
    );
    return ok(null, 'Password updated');
  } catch (error) {
    return handleRouteError(error);
  }
}
