'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldXIcon, CircleCheckIcon } from '@animateicons/react/lucide';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { useChangePassword } from '@/features/auth/hooks/use-change-password';
import {
  changePasswordFormSchema,
  type ChangePasswordFormInput,
} from '@/features/auth/validators/auth.schema';
import { extractApiErrorMessage } from '@/features/auth/utils/extract-api-error';

export function ChangePasswordForm() {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema),
  });

  const onSubmit = handleSubmit(({ confirmNewPassword: _confirmNewPassword, ...values }) => {
    changePassword.mutate(values, {
      onSuccess: () => reset(),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {changePassword.isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300 animate-shake">
          <ShieldXIcon size={18} className="shrink-0" />
          <span>{extractApiErrorMessage(changePassword.error, 'Unable to change password')}</span>
        </div>
      )}

      {changePassword.isSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-3 text-sm text-cyan-300">
          <CircleCheckIcon size={18} className="shrink-0" />
          <span>Password updated. Other devices have been signed out.</span>
        </div>
      )}

      <PasswordInput
        label="Current password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />

      <PasswordInput
        label="New password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />

      <PasswordInput
        label="Confirm new password"
        autoComplete="new-password"
        placeholder="••••••••"
        error={errors.confirmNewPassword?.message}
        {...register('confirmNewPassword')}
      />

      <Button type="submit" isLoading={isSubmitting || changePassword.isPending} className="w-auto px-5">
        Update password
      </Button>
    </form>
  );
}
