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
import { useQueryClient } from '@tanstack/react-query';
import type { LoginPayload, LoginWorkspace, User } from '@/types/auth.types';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import type { Workspace } from '@/features/workspaces/types/workspace.types';
import { workspaceService } from '@/features/workspaces/services/workspace.service';
import { WORKSPACES_KEY } from '@/features/workspaces/hooks/use-workspaces';

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

function toWorkspace(input: LoginWorkspace): Workspace {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    logoUrl: input.logoUrl ?? null,
    color: input.color ?? null,
    plan: input.plan,
    createdAt: input.createdAt,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, setUser, clearUser } = useAuthStore();
  const setCurrentWorkspace = useWorkspaceStore(
    (s) => s.setCurrentWorkspace,
  );
  const clearWorkspaceStore = useWorkspaceStore((s) => s.clear);
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
      .then(({ user: userData, workspace }) => {
        setUser(userData);
        setAuthCookie(true);
        // Só sobrescreve se o backend trouxe — preserva o persist do F5.
        if (workspace) {
          setCurrentWorkspace(toWorkspace(workspace));
        }
        qc.prefetchQuery({
          queryKey: [...WORKSPACES_KEY, JSON.stringify({})],
          queryFn: () => workspaceService.list(),
        });
      })
      .catch(() => {
        clearUser();
        clearWorkspaceStore();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setAuthCookie(false);
        qc.clear();
      })
      .finally(() => setIsLoading(false));
  }, [
    setUser,
    clearUser,
    setCurrentWorkspace,
    clearWorkspaceStore,
    qc,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function handleAuthExpired() {
      clearUser();
      clearWorkspaceStore();
      setAuthCookie(false);
      qc.clear();
      router.push('/login');
    }
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [clearUser, clearWorkspaceStore, router, qc]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { user: userData, tokens, workspace } =
        await authService.login(payload);
      localStorage.setItem('access_token', tokens.accessToken);
      localStorage.setItem('refresh_token', tokens.refreshToken);
      setAuthCookie(true);
      qc.clear();
      setUser(userData);
      if (workspace) {
        setCurrentWorkspace(toWorkspace(workspace));
      } else {
        setCurrentWorkspace(null);
      }
      qc.prefetchQuery({
        queryKey: [...WORKSPACES_KEY, JSON.stringify({})],
        queryFn: () => workspaceService.list(),
      });
      router.push(workspace ? '/inicio' : '/workspaces/new');
    },
    [setUser, router, setCurrentWorkspace, qc],
  );

  const logout = useCallback(() => {
    authService.logout().catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_workspace');
    localStorage.removeItem('current_workspace_id');
    setAuthCookie(false);
    clearUser();
    clearWorkspaceStore();
    qc.clear();
    router.push('/login');
  }, [clearUser, clearWorkspaceStore, router, qc]);

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
