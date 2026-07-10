'use client';

import { useState } from 'react';
import { TriangleAlertIcon, XIcon } from '@animateicons/react/lucide';
import { useResendVerification } from '@/features/auth/hooks/use-resend-verification';

export function UnverifiedBanner() {
  const [dismissed, setDismissed] = useState(false);
  const resendVerification = useResendVerification();

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <div className="flex items-center gap-2">
        <TriangleAlertIcon size={18} className="shrink-0" />
        <span>
          Please verify your email address.{' '}
          {resendVerification.isSuccess ? (
            <span className="font-medium">Verification email sent.</span>
          ) : (
            <button
              type="button"
              onClick={() => resendVerification.mutate()}
              disabled={resendVerification.isPending}
              className="font-medium underline underline-offset-2 hover:text-amber-100 disabled:opacity-60"
            >
              Resend email
            </button>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-amber-300 hover:text-amber-100"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
