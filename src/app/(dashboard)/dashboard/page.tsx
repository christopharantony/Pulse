'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ActivityIcon, LoaderCircleIcon, LogoutIcon, ShieldCheckIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { UnverifiedBanner } from '@/features/auth/components/unverified-banner';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (isError) router.replace('/login');
  }, [isError, router]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.push('/login'),
    });
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <LoaderCircleIcon size={28} className="animate-spin text-cyan-400" isAnimated={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 animate-fade-in-up">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ActivityIcon size={22} className="text-cyan-400" />
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings/security"
              className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100"
            >
              <ShieldCheckIcon size={16} />
              Security
            </Link>
            <Button variant="ghost" className="w-auto px-4" onClick={handleLogout} isLoading={logout.isPending}>
              <LogoutIcon size={16} />
              Sign out
            </Button>
          </div>
        </header>

        {user && !user.emailVerified && <UnverifiedBanner />}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">{user?.name}</h1>
          <p className="mt-1 text-slate-400">{user?.email}</p>
        </div>
      </div>
    </main>
  );
}
