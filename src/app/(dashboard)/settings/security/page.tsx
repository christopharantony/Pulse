'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/feedback/spinner';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useLogoutAllDevices } from '@/features/auth/hooks/use-logout-all-devices';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { SessionList } from '@/features/auth/components/session-list';
import { LogoutAllOthersButton } from '@/features/auth/components/logout-all-others-button';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { isLoading, isError } = useCurrentUser();
  const logoutAllDevices = useLogoutAllDevices();

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 text-foreground">Security</h1>
        <p className="text-small text-muted-foreground">
          Manage your password and see where you&apos;re signed in.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface/50 p-6">
        <h2 className="text-label uppercase tracking-[0.15em] text-muted-foreground">
          Change password
        </h2>
        <ChangePasswordForm />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-label uppercase tracking-[0.15em] text-muted-foreground">
            Active sessions
          </h2>
          <LogoutAllOthersButton />
        </div>
        <SessionList />
      </section>

      <Button
        variant="ghost"
        className="w-auto px-4"
        onClick={() =>
          logoutAllDevices.mutate(undefined, {
            onSuccess: () => router.push('/login'),
          })
        }
        isLoading={logoutAllDevices.isPending}
      >
        <LogoutIcon size={16} />
        Log out of all devices
      </Button>
    </div>
  );
}
