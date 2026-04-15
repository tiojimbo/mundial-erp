import { create } from 'zustand';

type ThemeColorKey =
  | 'indigo'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'violet'
  | 'orange'
  | 'gray'
  | 'green'
  | 'teal';

type ThemeColorState = {
  colorKey: ThemeColorKey;
  setColorKey: (key: ThemeColorKey) => void;
};

const STORAGE_KEY = 'mundial-theme-color';

const COLOR_MAP: Record<
  ThemeColorKey,
  {
    dark: string;
    darker: string;
    base: string;
    alpha24: string;
    alpha16: string;
    alpha10: string;
  }
> = {
  indigo: {
    dark: 'var(--purple-800)',
    darker: 'var(--purple-700)',
    base: 'var(--purple-500)',
    alpha24: 'var(--purple-alpha-24)',
    alpha16: 'var(--purple-alpha-16)',
    alpha10: 'var(--purple-alpha-10)',
  },
  blue: {
    dark: 'var(--blue-800)',
    darker: 'var(--blue-700)',
    base: 'var(--blue-500)',
    alpha24: 'var(--blue-alpha-24)',
    alpha16: 'var(--blue-alpha-16)',
    alpha10: 'var(--blue-alpha-10)',
  },
  purple: {
    dark: 'var(--purple-800)',
    darker: 'var(--purple-700)',
    base: 'var(--purple-500)',
    alpha24: 'var(--purple-alpha-24)',
    alpha16: 'var(--purple-alpha-16)',
    alpha10: 'var(--purple-alpha-10)',
  },
  pink: {
    dark: 'var(--pink-800)',
    darker: 'var(--pink-700)',
    base: 'var(--pink-500)',
    alpha24: 'var(--pink-alpha-24)',
    alpha16: 'var(--pink-alpha-16)',
    alpha10: 'var(--pink-alpha-10)',
  },
  violet: {
    dark: 'var(--sky-800)',
    darker: 'var(--sky-700)',
    base: 'var(--sky-500)',
    alpha24: 'var(--sky-alpha-24)',
    alpha16: 'var(--sky-alpha-16)',
    alpha10: 'var(--sky-alpha-10)',
  },
  orange: {
    dark: 'var(--orange-800)',
    darker: 'var(--orange-700)',
    base: 'var(--orange-500)',
    alpha24: 'var(--orange-alpha-24)',
    alpha16: 'var(--orange-alpha-16)',
    alpha10: 'var(--orange-alpha-10)',
  },
  gray: {
    dark: 'var(--gray-800)',
    darker: 'var(--gray-700)',
    base: 'var(--gray-500)',
    alpha24: 'var(--gray-alpha-24)',
    alpha16: 'var(--gray-alpha-16)',
    alpha10: 'var(--gray-alpha-10)',
  },
  green: {
    dark: 'var(--green-800)',
    darker: 'var(--green-700)',
    base: 'var(--green-500)',
    alpha24: 'var(--green-alpha-24)',
    alpha16: 'var(--green-alpha-16)',
    alpha10: 'var(--green-alpha-10)',
  },
  teal: {
    dark: 'var(--teal-800)',
    darker: 'var(--teal-700)',
    base: 'var(--teal-500)',
    alpha24: 'var(--teal-alpha-24)',
    alpha16: 'var(--teal-alpha-16)',
    alpha10: 'var(--teal-alpha-10)',
  },
};

export function applyThemeColor(key: ThemeColorKey) {
  if (typeof document === 'undefined') return;
  const colors = COLOR_MAP[key];
  if (!colors) return;

  const root = document.documentElement;
  root.style.setProperty('--primary-dark', colors.dark);
  root.style.setProperty('--primary-darker', colors.darker);
  root.style.setProperty('--primary-base', colors.base);
  root.style.setProperty('--primary-alpha-24', colors.alpha24);
  root.style.setProperty('--primary-alpha-16', colors.alpha16);
  root.style.setProperty('--primary-alpha-10', colors.alpha10);
}

function getStoredColor(): ThemeColorKey {
  if (typeof window === 'undefined') return 'blue';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in COLOR_MAP) return stored as ThemeColorKey;
  return 'blue';
}

const DEFAULT_COLOR: ThemeColorKey = 'blue';

export const useThemeColorStore = create<ThemeColorState>((set) => ({
  colorKey: DEFAULT_COLOR,
  setColorKey: (key) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, key);
    }
    applyThemeColor(key);
    set({ colorKey: key });
  },
}));

/**
 * Call once from a useEffect to hydrate the stored color without SSR mismatch.
 */
export function hydrateThemeColor() {
  const stored = getStoredColor();
  if (stored !== DEFAULT_COLOR) {
    useThemeColorStore.setState({ colorKey: stored });
    applyThemeColor(stored);
  }
}

export type { ThemeColorKey };
