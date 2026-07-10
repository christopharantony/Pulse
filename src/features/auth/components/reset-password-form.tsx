'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MoveRightIcon, ShieldXIcon, CircleCheckIcon } from '@animateicons/react/lucide';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { useResetPassword } from '@/features/auth/hooks/use-reset-password';
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from '@/features/auth/validators/auth.schema';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(({ confirmPassword: _confirmPassword, ...values }) => {
    resetPassword.mutate(values);
  });

  if (!token) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
        <ShieldXIcon size={18} className="shrink-0" />
        <span>This reset link is missing its token. Request a new one.</span>
      </div>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-3 text-sm text-cyan-300">
          <CircleCheckIcon size={18} className="shrink-0" />
          <span>Your password has been reset.</span>
        </div>
        <Button onClick={() => router.push('/login')}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-100">Choose a new password</h1>
        <p className="text-sm text-slate-400">Make it something you haven&apos;t used before.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {resetPassword.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300 animate-shake">
            <ShieldXIcon size={18} className="shrink-0" />
            <span>{extractApiErrorMessage(resetPassword.error, 'Unable to reset password')}</span>
          </div>
        )}

        <PasswordInput
          label="New password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting || resetPassword.isPending} className="group">
          Reset password
          <MoveRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        <Link href="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
