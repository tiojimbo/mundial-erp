'use client';

import { RiCheckLine } from '@remixicon/react';
import { useThemeColorStore, type ThemeColorKey } from '@/stores/theme-color.store';
import { cn } from '@/lib/cn';

const THEME_COLORS: { key: ThemeColorKey; label: string; hex: string }[] = [
  { key: 'indigo', label: 'Índigo', hex: '#6C63FF' },
  { key: 'blue', label: 'Azul', hex: '#3B82F6' },
  { key: 'purple', label: 'Roxo', hex: '#A855F7' },
  { key: 'pink', label: 'Rosa', hex: '#F472B6' },
  { key: 'violet', label: 'Violeta', hex: '#818CF8' },
  { key: 'orange', label: 'Laranja', hex: '#F59E42' },
  { key: 'gray', label: 'Cinza', hex: '#A6A6A6' },
  { key: 'green', label: 'Verde', hex: '#6CA66C' },
  { key: 'teal', label: 'Teal', hex: '#2DD4BF' },
];

export function ThemeColorPicker() {
  const { colorKey, setColorKey } = useThemeColorStore();

  return (
    <div className='flex flex-wrap gap-2'>
      {THEME_COLORS.map((color) => {
        const isSelected = colorKey === color.key;
        return (
          <button
            key={color.key}
            type='button'
            title={color.label}
            onClick={() => setColorKey(color.key)}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg transition-all',
              isSelected
                ? 'ring-2 ring-primary-base ring-offset-2'
                : 'border border-stroke-soft-200 hover:scale-110',
            )}
            style={{ backgroundColor: color.hex }}
          >
            {isSelected && <RiCheckLine className='size-4 text-static-white' />}
          </button>
        );
      })}
    </div>
  );
}
