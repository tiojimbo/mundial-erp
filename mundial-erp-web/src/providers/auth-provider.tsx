'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User, LoginPayload } from '@/types/auth.types';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookie(hasToken: boolean) {
  if (typeof document === 'undefined') return;
  if (hasToken) {
    document.cookie = 'auth_token=1; path=/; SameSite=Lax';
  } else {
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser, clearUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      setAuthCookie(false);
      return;
    }

    authService
      .me()
      .then((userData) => {
        setUser(userData);
        setAuthCookie(true);
      })
      .catch(() => {
        clearUser();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setAuthCookie(false);
      })
      .finally(() => setIsLoading(false));
  }, [setUser, clearUser]);

  useEffect(() => {
    function handleAuthExpired() {
      clearUser();
      setAuthCookie(false);
      router.push('/login');
    }
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [clearUser, router]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { user: userData, tokens } = await authService.login(payload);
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      setAuthCookie(true);
      setUser(userData);
      router.push('/inicio');
    },
    [setUser, router],
  );

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAuthCookie(false);
    clearUser();
    router.push('/login');
  }, [clearUser, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
