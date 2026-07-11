'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/feedback/spinner';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { UnverifiedBanner } from '@/features/auth/components/unverified-banner';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();

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
    <div className="mx-auto flex max-w-3xl flex-col gap-8 animate-fade-in-up">
      {user && !user.emailVerified && <UnverifiedBanner />}

      <div className="rounded-2xl border border-border-subtle bg-surface/50 p-8">
        <p className="text-label uppercase tracking-[0.2em] text-accent">Welcome back</p>
        <h1 className="mt-2 text-h1 text-foreground">{user?.name}</h1>
        <p className="mt-1 text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  );
}
