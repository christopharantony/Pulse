'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <ErrorState
        code="500"
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        action={
          <Button onClick={reset} className="w-auto px-5">
            Try again
          </Button>
        }
      />
    </div>
  );
}
