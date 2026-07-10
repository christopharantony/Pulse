import { useQuery } from '@tanstack/react-query';
import { fetchSessionsRequest } from '@/features/auth/api/sessions.api';
import { authKeys } from '@/features/auth/hooks/query-keys';

export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: fetchSessionsRequest,
  });
}
