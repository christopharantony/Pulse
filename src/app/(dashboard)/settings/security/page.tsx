'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ActivityIcon, ChevronLeftIcon, LoaderCircleIcon, LogoutIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <LoaderCircleIcon size={28} className="animate-spin text-cyan-400" isAnimated={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 animate-fade-in-up">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ActivityIcon size={22} className="text-cyan-400" />
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-slate-100"
          >
            <ChevronLeftIcon size={16} />
            Back to dashboard
          </Link>
        </header>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-100">Security</h1>
          <p className="text-sm text-slate-400">
            Manage your password and see where you&apos;re signed in.
          </p>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
            Change password
          </h2>
          <ChangePasswordForm />
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
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
    </main>
  );
}
