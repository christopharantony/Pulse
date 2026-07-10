import { useMutation, useQueryClient } from '@tanstack/react-query';
import { revokeSessionRequest } from '@/features/auth/api/sessions.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSessionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}
