'use client';

import { useEffect } from 'react';
import { applyThemeColor, useThemeColorStore } from '@/stores/theme-color.store';

export function ThemeColorProvider() {
  const colorKey = useThemeColorStore((s) => s.colorKey);

  useEffect(() => {
    applyThemeColor(colorKey);
  }, [colorKey]);

  return null;
}
