import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerRequest } from '@/features/auth/api/auth.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
}
