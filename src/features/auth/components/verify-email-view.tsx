'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LoaderCircleIcon, ShieldXIcon, CircleCheckIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { useVerifyEmail } from '@/features/auth/hooks/use-verify-email';
import { useResendVerification } from '@/features/auth/hooks/use-resend-verification';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const verifyEmail = useVerifyEmail();
  const resendVerification = useResendVerification();
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (token && !hasSubmitted.current) {
      hasSubmitted.current = true;
      verifyEmail.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
        <ShieldXIcon size={18} className="shrink-0" />
        <span>This verification link is missing its token.</span>
      </div>
    );
  }

  if (verifyEmail.isPending || verifyEmail.isIdle) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoaderCircleIcon size={28} className="animate-spin text-cyan-400" isAnimated={false} />
      </div>
    );
  }

  if (verifyEmail.isSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-3 text-sm text-cyan-300">
          <CircleCheckIcon size={18} className="shrink-0" />
          <span>Your email has been verified.</span>
        </div>
        <Button onClick={() => window.location.assign('/dashboard')}>
          Continue to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
        <ShieldXIcon size={18} className="shrink-0" />
        <span>{extractApiErrorMessage(verifyEmail.error, 'This link is invalid or expired')}</span>
      </div>
      <Button
        variant="ghost"
        onClick={() => resendVerification.mutate()}
        isLoading={resendVerification.isPending}
        disabled={resendVerification.isSuccess}
      >
        {resendVerification.isSuccess ? 'Verification email sent' : 'Resend verification email'}
      </Button>
      <p className="text-center text-sm text-slate-400">
        <Link href="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
