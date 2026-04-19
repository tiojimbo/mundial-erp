import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Workspace } from '@/features/workspaces/types/workspace.types';

type WorkspaceState = {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  clear: () => void;
};

// availableWorkspaces NÃO vive aqui — server state é do React Query (ADR-002).
// currentWorkspace persistido inteiro (não só id) para evitar flash no F5.
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      clear: () => set({ currentWorkspace: null }),
    }),
    {
      name: 'current_workspace',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    },
  ),
);
