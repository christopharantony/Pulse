import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logoutRequest } from '@/features/auth/api/auth.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.currentUser, null);
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
}
