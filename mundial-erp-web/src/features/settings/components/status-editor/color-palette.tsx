'use client';

import { useRef } from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PALETTE } from './constants';

interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPalette({ value, onChange }: ColorPaletteProps) {
  const eyedropperRef = useRef<HTMLInputElement>(null);

  function isActive(color: string): boolean {
    return color.toLowerCase() === value.toLowerCase();
  }

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label="Paleta de cores">
      <div className="grid grid-cols-8 gap-1.5">
        {PALETTE.slice(0, 8).map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Cor ${color}`}
            aria-pressed={isActive(color)}
            onClick={() => onChange(color)}
            className={cn(
              'size-6 rounded-full transition',
              'hover:scale-110',
              isActive(color) &&
                'ring-2 ring-offset-2 ring-offset-bg-white-0 ring-stroke-sub-300',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {PALETTE.slice(8).map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Cor ${color}`}
            aria-pressed={isActive(color)}
            onClick={() => onChange(color)}
            className={cn(
              'size-6 rounded-full transition',
              'hover:scale-110',
              isActive(color) &&
                'ring-2 ring-offset-2 ring-offset-bg-white-0 ring-stroke-sub-300',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        <button
          type="button"
          aria-label="Escolher cor personalizada"
          onClick={() => eyedropperRef.current?.click()}
          className={cn(
            'flex size-6 items-center justify-center rounded-full',
            'ring-1 ring-inset ring-stroke-soft-200 text-text-sub-600',
            'hover:bg-bg-weak-50 transition',
          )}
        >
          <Pipette className="size-3.5" />
          <input
            ref={eyedropperRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
