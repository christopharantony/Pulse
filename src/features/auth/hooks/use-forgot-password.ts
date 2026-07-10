import { useMutation } from '@tanstack/react-query';
import { forgotPasswordRequest } from '@/features/auth/api/auth.api';

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPasswordRequest,
  });
}
