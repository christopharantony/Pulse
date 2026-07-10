'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailIcon, MoveRightIcon, ShieldXIcon, CircleCheckIcon } from '@animateicons/react/lucide';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForgotPassword } from '@/features/auth/hooks/use-forgot-password';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/features/auth/validators/auth.schema';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit((values) => {
    forgotPassword.mutate(values);
  });

  if (forgotPassword.isSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-3 text-sm text-cyan-300">
          <CircleCheckIcon size={18} className="shrink-0" />
          <span>If an account exists for that email, a reset link has been sent.</span>
        </div>
        <p className="text-center text-sm text-slate-400">
          <Link href="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-100">Forgot password?</h1>
        <p className="text-sm text-slate-400">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {forgotPassword.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300 animate-shake">
            <ShieldXIcon size={18} className="shrink-0" />
            <span>{extractApiErrorMessage(forgotPassword.error, 'Unable to send reset link')}</span>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<MailIcon size={18} isAnimated={false} />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" isLoading={isSubmitting || forgotPassword.isPending} className="group">
          Send reset link
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
