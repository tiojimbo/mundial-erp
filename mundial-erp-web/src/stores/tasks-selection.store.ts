'use client';

import { create } from 'zustand';

type TasksSelectionState = {
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  clear: () => void;
  setMany: (ids: string[]) => void;
};

export const useTasksSelectionStore = create<TasksSelectionState>((set, get) => ({
  selectedIds: [],
  isSelected: (id) => get().selectedIds.includes(id),
  toggle: (id) =>
    set((s) =>
      s.selectedIds.includes(id)
        ? { selectedIds: s.selectedIds.filter((x) => x !== id) }
        : { selectedIds: [...s.selectedIds, id] },
    ),
  select: (id) =>
    set((s) =>
      s.selectedIds.includes(id) ? s : { selectedIds: [...s.selectedIds, id] },
    ),
  deselect: (id) =>
    set((s) => ({ selectedIds: s.selectedIds.filter((x) => x !== id) })),
  clear: () => set({ selectedIds: [] }),
  setMany: (ids) => set({ selectedIds: ids }),
}));
