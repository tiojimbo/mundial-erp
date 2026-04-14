import { create } from 'zustand';

type ProcessStep = {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
};

type ProcessContextState = {
  processName: string | null;
  currentStep: string | null;
  steps: ProcessStep[];
  entityTag: string | null;
  breadcrumbs: Array<{ label: string; href?: string }>;
  setProcess: (name: string, steps: ProcessStep[]) => void;
  setCurrentStep: (stepId: string) => void;
  setEntityTag: (tag: string | null) => void;
  setBreadcrumbs: (crumbs: Array<{ label: string; href?: string }>) => void;
  clearProcess: () => void;
};

export const useProcessContextStore = create<ProcessContextState>((set) => ({
  processName: null,
  currentStep: null,
  steps: [],
  entityTag: null,
  breadcrumbs: [],
  setProcess: (name, steps) =>
    set({ processName: name, steps, currentStep: steps[0]?.id ?? null }),
  setCurrentStep: (stepId) => set({ currentStep: stepId }),
  setEntityTag: (tag) => set({ entityTag: tag }),
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
  clearProcess: () =>
    set({
      processName: null,
      currentStep: null,
      steps: [],
      entityTag: null,
      breadcrumbs: [],
    }),
}));
