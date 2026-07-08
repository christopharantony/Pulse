import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/services/api/client';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    enabled: false,
  });
}
