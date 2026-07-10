'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailIcon, MoveRightIcon, ShieldXIcon } from '@animateicons/react/lucide';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useLogin } from '@/features/auth/hooks/use-login';
import { loginSchema, type LoginInput } from '@/features/auth/validators/auth.schema';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';
import type { z } from 'zod';

// rememberMe has a zod .default(), so the parsed output (LoginInput) always has it defined
// while the raw form values (before parsing) may not — RHF's 3-generic form lets the form use
// the input shape and handleSubmit hand back the fully-defaulted output shape.
type LoginFormValues = z.input<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => router.push('/dashboard'),
    });
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-400">Sign in to continue to your dashboard.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {login.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300 animate-shake">
            <ShieldXIcon size={18} className="shrink-0" />
            <span>{extractApiErrorMessage(login.error, 'Unable to sign in')}</span>
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

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" {...register('rememberMe')} />
          <Link href="/forgot-password" className="text-sm font-medium text-cyan-400 hover:text-cyan-300">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting || login.isPending} className="group">
          Sign in
          <MoveRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-cyan-400 hover:text-cyan-300">
          Create one
        </Link>
      </p>
    </div>
  );
}
