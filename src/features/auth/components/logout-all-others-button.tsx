'use client';

import { LogoutIcon } from '@animateicons/react/lucide';
import { Button } from '@/components/ui/button';
import { useRevokeOtherSessions } from '@/features/auth/hooks/use-revoke-other-sessions';

export function LogoutAllOthersButton() {
  const revokeOthers = useRevokeOtherSessions();

  return (
    <Button
      variant="ghost"
      className="w-auto px-4"
      onClick={() => revokeOthers.mutate()}
      isLoading={revokeOthers.isPending}
      disabled={revokeOthers.isSuccess}
    >
      <LogoutIcon size={16} />
      {revokeOthers.isSuccess ? 'Other devices signed out' : 'Log out of other devices'}
    </Button>
  );
}
