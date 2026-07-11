import Link from 'next/link';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <ErrorState
      code="403"
      title="Access forbidden"
      description="You don't have permission to view this page."
      action={
        <Button asChild variant="outline" className="w-auto px-5">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
