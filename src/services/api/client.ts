import { api } from '@/lib/axios';

export async function getHealth() {
  return api.get('/health');
}
