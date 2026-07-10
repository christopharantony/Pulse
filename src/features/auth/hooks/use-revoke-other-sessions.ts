import { useMutation, useQueryClient } from '@tanstack/react-query';
import { revokeOtherSessionsRequest } from '@/features/auth/api/sessions.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeOtherSessionsRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}
