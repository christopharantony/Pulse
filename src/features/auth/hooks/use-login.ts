import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginRequest } from '@/features/auth/api/auth.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
}
