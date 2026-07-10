import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyEmailRequest } from '@/features/auth/api/auth.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyEmailRequest,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.currentUser, user);
    },
  });
}
