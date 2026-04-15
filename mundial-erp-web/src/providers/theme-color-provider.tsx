'use client';

import { useEffect, useRef } from 'react';
import {
  applyThemeColor,
  hydrateThemeColor,
  useThemeColorStore,
} from '@/stores/theme-color.store';

export function ThemeColorProvider() {
  const colorKey = useThemeColorStore((s) => s.colorKey);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      hydrateThemeColor();
      return;
    }
    applyThemeColor(colorKey);
  }, [colorKey]);

  return null;
}
