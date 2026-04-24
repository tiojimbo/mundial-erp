import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CollapsibleSectionKey,
  TaskFilters,
} from '../types/task.types';
import {
  DEFAULT_ACTIVITY_FILTERS,
  type ActivityFilters,
} from '../schemas/activity-filters.schema';

/**
 * Sprint 0 (TSK-102 foundation) — Zustand store para UI state da feature Tasks.
 *
 * Persistencia:
 *   - `savedFilters`, `activeFilterId`, `collapsedSections`,
 *     `activitiesPanelOpen`, `activitiesFilters` vao para localStorage
 *     com key `mundial.tasks.ui` versionado.
 *
 * Sprint 5 (TSK-160): `activitiesFilters` por taskId — filtros do painel
 * de atividades persistidos por tarefa. Migracao v1 → v2 preenche `{}`.
 *
 * TODO Sprint 1 (TSK-120): persistir `savedFilters` tambem server-side via
 * `ProcessView.config` para portabilidade entre dispositivos.
 */

export type SavedTaskFilter = {
  id: string;
  name: string;
  filters: TaskFilters;
  createdAt: string;
};

type CollapsedSectionsState = Partial<Record<CollapsibleSectionKey, boolean>>;

type TasksUiState = {
  savedFilters: SavedTaskFilter[];
  activeFilterId: string | null;
  activitiesPanelOpen: boolean;
  collapsedSections: CollapsedSectionsState;
  /** Filtros do feed por `taskId` — persistido, migracao trivial v1→v2. */
  activitiesFilters: Record<string, ActivityFilters>;
  /**
   * Conexoes SSE ativas por `taskId` — volatil (NAO persistido).
   * Usado pelo `TaskSSEClient` para respeitar o cap de 3 conexoes
   * simultaneas por usuario (TSK-803).
   */
  activeSseTaskIds: string[];
};

type TasksUiActions = {
  addSavedFilter: (filter: SavedTaskFilter) => void;
  removeSavedFilter: (filterId: string) => void;
  setActiveFilter: (filterId: string | null) => void;
  toggleActivitiesPanel: () => void;
  setActivitiesPanelOpen: (open: boolean) => void;
  toggleSection: (key: CollapsibleSectionKey) => void;
  setSectionCollapsed: (key: CollapsibleSectionKey, collapsed: boolean) => void;
  setActivitiesFilter: (taskId: string, patch: Partial<ActivityFilters>) => void;
  clearActivitiesFilter: (taskId: string) => void;
  registerSseConnection: (taskId: string) => boolean;
  unregisterSseConnection: (taskId: string) => void;
};

/** Cap de conexoes SSE simultaneas por usuario — PLANO §16 R11 / TSK-803. */
export const MAX_CONCURRENT_SSE_CONNECTIONS = 3;

export type TasksUiStore = TasksUiState & TasksUiActions;

const INITIAL_STATE: TasksUiState = {
  savedFilters: [],
  activeFilterId: null,
  activitiesPanelOpen: true,
  collapsedSections: {},
  activitiesFilters: {},
  activeSseTaskIds: [],
};

const STORAGE_KEY = 'mundial.tasks.ui';
const STORE_VERSION = 2;

export const useTasksStore = create<TasksUiStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      addSavedFilter: (filter) =>
        set((state) => ({
          savedFilters: [...state.savedFilters, filter],
        })),
      removeSavedFilter: (filterId) =>
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== filterId),
          activeFilterId:
            state.activeFilterId === filterId ? null : state.activeFilterId,
        })),
      setActiveFilter: (filterId) => set({ activeFilterId: filterId }),
      toggleActivitiesPanel: () =>
        set((state) => ({ activitiesPanelOpen: !state.activitiesPanelOpen })),
      setActivitiesPanelOpen: (open) => set({ activitiesPanelOpen: open }),
      toggleSection: (key) =>
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [key]: !state.collapsedSections[key],
          },
        })),
      setSectionCollapsed: (key, collapsed) =>
        set((state) => ({
          collapsedSections: {
            ...state.collapsedSections,
            [key]: collapsed,
          },
        })),
      setActivitiesFilter: (taskId, patch) =>
        set((state) => {
          const current =
            state.activitiesFilters[taskId] ?? DEFAULT_ACTIVITY_FILTERS;
          return {
            activitiesFilters: {
              ...state.activitiesFilters,
              [taskId]: { ...current, ...patch },
            },
          };
        }),
      clearActivitiesFilter: (taskId) =>
        set((state) => {
          const next = { ...state.activitiesFilters };
          delete next[taskId];
          return { activitiesFilters: next };
        }),
      registerSseConnection: (taskId) => {
        const current = get().activeSseTaskIds;
        if (current.includes(taskId)) return true;
        if (current.length >= MAX_CONCURRENT_SSE_CONNECTIONS) return false;
        set({ activeSseTaskIds: [...current, taskId] });
        return true;
      },
      unregisterSseConnection: (taskId) =>
        set((state) => ({
          activeSseTaskIds: state.activeSseTaskIds.filter(
            (id) => id !== taskId,
          ),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Migracao trivial v1 → v2: adiciona `activitiesFilters: {}`.
      migrate: (persistedState, version) => {
        const state = (persistedState as Partial<TasksUiStore>) ?? {};
        if (version < 2) {
          return {
            ...state,
            activitiesFilters: {},
          } as TasksUiStore;
        }
        return state as TasksUiStore;
      },
      partialize: (state) => ({
        savedFilters: state.savedFilters,
        activeFilterId: state.activeFilterId,
        activitiesPanelOpen: state.activitiesPanelOpen,
        collapsedSections: state.collapsedSections,
        activitiesFilters: state.activitiesFilters,
      }),
    },
  ),
);
