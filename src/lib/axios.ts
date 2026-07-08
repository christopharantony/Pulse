import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Required so the HttpOnly auth cookies are sent with every request.
  withCredentials: true,
});

let refreshPromise: Promise<unknown> | null = null;

// On a 401 from any endpoint other than the auth endpoints themselves, attempt exactly one
// silent refresh via /api/auth/refresh, then retry the original request. This is where session
// renewal actually happens — middleware intentionally does not attempt refresh (see middleware.ts).
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const isAuthEndpoint = config?.url?.startsWith('/auth/');

    if (error.response?.status !== 401 || !config || isAuthEndpoint || config._retry) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      refreshPromise ??= api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return api(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
