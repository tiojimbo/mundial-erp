import axios, { isAxiosError, type AxiosError } from 'axios';
import type { LoginResponse } from '@/types/auth.types';
import type { ApiResponse } from '@/types/api.types';

/** Mensagem amigável para falhas de rede / API offline (PLANO: backend :3001). */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && !isAxiosError(error)) {
    return error.message;
  }
  if (isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string | string[] }>;
    const body = ax.response?.data;
    if (body && typeof body.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
    if (ax.response?.status) {
      return `Erro ${ax.response.status} ao contatar o servidor.`;
    }
    const code = ax.code;
    if (code === 'ECONNABORTED' || ax.message?.toLowerCase().includes('timeout')) {
      return 'Tempo esgotado ao contatar a API. Tente novamente.';
    }
    if (
      code === 'ERR_NETWORK' ||
      code === 'ECONNREFUSED' ||
      ax.message === 'Network Error'
    ) {
      return 'Não foi possível conectar à API. Inicie o backend em mundial-erp-api (porta 3001: npm run start:dev) e confira NEXT_PUBLIC_API_URL.';
    }
    return ax.message || 'Erro de comunicação com o servidor.';
  }
  return 'Erro inesperado.';
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(
        error instanceof Error ? error : new Error(getApiErrorMessage(error)),
      );
    }

    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data: envelope } = await axios.post<
          ApiResponse<LoginResponse>
        >(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });

        const { accessToken, refreshToken: newRefresh } =
          envelope.data.tokens;

        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', newRefresh);

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof document !== 'undefined') {
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }

        return Promise.reject(new Error(getApiErrorMessage(refreshError)));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(new Error(getApiErrorMessage(error)));
  },
);
