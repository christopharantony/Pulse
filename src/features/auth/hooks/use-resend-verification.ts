import { useMutation } from '@tanstack/react-query';
import { resendVerificationRequest } from '@/features/auth/api/auth.api';

export function useResendVerification() {
  return useMutation({
    mutationFn: resendVerificationRequest,
  });
}
