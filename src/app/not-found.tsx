import Link from 'next/link';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <ErrorState
        code="404"
        title="Page not found"
        description="The page you're looking for doesn't exist or may have been moved."
        action={
          <Button asChild className="w-auto px-5">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
