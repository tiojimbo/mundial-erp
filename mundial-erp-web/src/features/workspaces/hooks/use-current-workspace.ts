import { useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { toWorkspaceUI } from '../utils/workspace-color';
import type { WorkspaceUI } from '../types/workspace.types';

export function useCurrentWorkspace(): WorkspaceUI | null {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  return useMemo(
    () => (currentWorkspace ? toWorkspaceUI(currentWorkspace) : null),
    [currentWorkspace],
  );
}
