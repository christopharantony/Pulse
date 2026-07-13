'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { UnverifiedBanner } from '@/features/auth/components/unverified-banner';
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { DashboardGrid } from '@/features/dashboard/components/dashboard-grid';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isError: userError } = useCurrentUser();
  const { data: overview, isLoading, isError, refetch, isFetching } = useDashboard();

  useEffect(() => {
    if (userError) router.replace('/login');
  }, [userError, router]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {user && !user.emailVerified && <UnverifiedBanner />}

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !overview ? (
        <ErrorState
          title="We couldn’t load your dashboard"
          description="Something went wrong fetching your data. Please try again."
          action={
            <Button onClick={() => refetch()} isLoading={isFetching}>
              Retry
            </Button>
          }
        />
      ) : (
        <div className="animate-fade-in-up">
          <DashboardGrid overview={overview} />
        </div>
      )}
    </div>
  );
}
