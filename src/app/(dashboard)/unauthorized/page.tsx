import Link from 'next/link';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <ErrorState
      code="401"
      title="Unauthorized"
      description="You need to sign in to access this page."
      action={
        <Button asChild className="w-auto px-5">
          <Link href="/login">Sign in</Link>
        </Button>
      }
    />
  );
}
