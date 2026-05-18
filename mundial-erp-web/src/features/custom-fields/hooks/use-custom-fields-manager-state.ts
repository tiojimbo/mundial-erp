import { useCallback, useState } from 'react';
import type {
  CustomFieldType,
  ManagerScope,
} from '../types/custom-field.types';

export type ManagerView =
  | { kind: 'all' }
  | { kind: 'workspace' }
  | { kind: 'allGroups' }
  | { kind: 'taskTypeFields' }
  | { kind: 'taskType'; taskTypeId: string }
  | { kind: 'space'; spaceId: string }
  | { kind: 'folder'; folderId: string }
  | { kind: 'list'; listId: string };

export interface ManagerState {
  view: ManagerView;
  selectedDefId: string | null;
  createOpen: boolean;
  createType: CustomFieldType | null;
  newGroupOpen: boolean;
  searchTerm: string;
  typeFilter: string | null;
}

export interface UseManagerStateArgs {
  initialView?: ManagerView;
}

const DEFAULT_VIEW: ManagerView = { kind: 'all' };

export function useCustomFieldsManagerState(args: UseManagerStateArgs = {}) {
  const [state, setState] = useState<ManagerState>({
    view: args.initialView ?? DEFAULT_VIEW,
    selectedDefId: null,
    createOpen: false,
    createType: null,
    newGroupOpen: false,
    searchTerm: '',
    typeFilter: null,
  });

  const setView = useCallback((view: ManagerView) => {
    setState((prev) => ({
      ...prev,
      view,
      selectedDefId: null,
      createOpen: false,
      createType: null,
    }));
  }, []);

  const selectDef = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedDefId: id,
      createOpen: false,
      createType: null,
    }));
  }, []);

  const openCreate = useCallback((type: CustomFieldType) => {
    setState((prev) => ({
      ...prev,
      createOpen: true,
      createType: type,
      selectedDefId: null,
    }));
  }, []);

  const closeCreate = useCallback(() => {
    setState((prev) => ({ ...prev, createOpen: false, createType: null }));
  }, []);

  const openNewGroup = useCallback(() => {
    setState((prev) => ({ ...prev, newGroupOpen: true }));
  }, []);

  const closeNewGroup = useCallback(() => {
    setState((prev) => ({ ...prev, newGroupOpen: false }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState((prev) => ({ ...prev, searchTerm: term }));
  }, []);

  const setTypeFilter = useCallback((type: string | null) => {
    setState((prev) => ({ ...prev, typeFilter: type }));
  }, []);

  return {
    state,
    setView,
    selectDef,
    openCreate,
    closeCreate,
    openNewGroup,
    closeNewGroup,
    setSearchTerm,
    setTypeFilter,
  };
}

export function viewToScope(view: ManagerView): {
  scope: ManagerScope;
  targetId?: string;
} {
  switch (view.kind) {
    case 'all':
      return { scope: 'all' };
    case 'allGroups':
      return { scope: 'all' };
    case 'taskTypeFields':
      return { scope: 'all' };
    case 'workspace':
      return { scope: 'workspace' };
    case 'taskType':
      return { scope: 'taskType', targetId: view.taskTypeId };
    case 'space':
      return { scope: 'space', targetId: view.spaceId };
    case 'folder':
      return { scope: 'folder', targetId: view.folderId };
    case 'list':
      return { scope: 'list', targetId: view.listId };
  }
}
