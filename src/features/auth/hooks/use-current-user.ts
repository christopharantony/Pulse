import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '@/features/auth/api/auth.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
