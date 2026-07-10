import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logoutAllDevicesRequest } from '@/features/auth/api/sessions.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useLogoutAllDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutAllDevicesRequest,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.currentUser, null);
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: authKeys.sessions });
    },
  });
}
