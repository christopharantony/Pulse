import { useMutation } from '@tanstack/react-query';
import { changePasswordRequest } from '@/features/auth/api/auth.api';

export function useChangePassword() {
  return useMutation({
    mutationFn: changePasswordRequest,
  });
}
