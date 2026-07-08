'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailIcon, MoveRightIcon, ShieldXIcon, UserIcon } from '@animateicons/react/lucide';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { useRegister } from '@/features/auth/hooks/use-register';
import {
  registerFormSchema,
  type RegisterFormInput,
} from '@/features/auth/validators/auth.schema';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  const onSubmit = handleSubmit(({ confirmPassword: _confirmPassword, ...values }) => {
    registerUser.mutate(values, {
      onSuccess: () => router.push('/dashboard'),
    });
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-100">Create your account</h1>
        <p className="text-sm text-slate-400">Start building momentum with Pulse.</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {registerUser.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300 animate-shake">
            <ShieldXIcon size={18} className="shrink-0" />
            <span>{extractApiErrorMessage(registerUser.error, 'Unable to create account')}</span>
          </div>
        )}

        <Input
          label="Name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          icon={<UserIcon size={18} isAnimated={false} />}
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          isLoading={isSubmitting || registerUser.isPending}
          className="group"
        >
          Create account
          <MoveRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
