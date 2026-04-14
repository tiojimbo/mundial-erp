import { create } from 'zustand';

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 272;
const SIDEBAR_COLLAPSED_WIDTH = 68;

type SidebarState = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  sidebarWidth: number;
  expandedGroups: Record<string, boolean>;
  expandedAreas: Record<string, boolean>;

  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleGroup: (label: string) => void;
  setGroupExpanded: (label: string, expanded: boolean) => void;
  toggleArea: (areaId: string) => void;
  setAreaExpanded: (areaId: string, expanded: boolean) => void;
};

export { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH, SIDEBAR_COLLAPSED_WIDTH };

export const useSidebarStore = create<SidebarState>((set) => ({
  isExpanded: true,
  isMobileOpen: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  expandedGroups: {},
  expandedAreas: {},

  toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
  setSidebarExpanded: (expanded) => set({ isExpanded: expanded }),
  setSidebarWidth: (width) =>
    set({ sidebarWidth: Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)) }),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  closeMobileSidebar: () => set({ isMobileOpen: false }),
  toggleGroup: (label) =>
    set((state) => ({
      expandedGroups: {
        ...state.expandedGroups,
        [label]: !state.expandedGroups[label],
      },
    })),
  setGroupExpanded: (label, expanded) =>
    set((state) => ({
      expandedGroups: {
        ...state.expandedGroups,
        [label]: expanded,
      },
    })),
  toggleArea: (areaId) =>
    set((state) => ({
      expandedAreas: {
        ...state.expandedAreas,
        [areaId]: !state.expandedAreas[areaId],
      },
    })),
  setAreaExpanded: (areaId, expanded) =>
    set((state) => ({
      expandedAreas: {
        ...state.expandedAreas,
        [areaId]: expanded,
      },
    })),
}));
