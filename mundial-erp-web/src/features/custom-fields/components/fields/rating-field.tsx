'use client';

import { Star } from 'lucide-react';
import type { BaseFieldProps } from './field-base';
import { FieldShell } from './field-shell';

export function RatingField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<number | null>) {
  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const maxStars =
    typeof definition.config?.maxStars === 'number' &&
    definition.config.maxStars > 0
      ? definition.config.maxStars
      : 5;
  const current = typeof value === 'number' ? value : 0;

  return (
    <FieldShell
      definition={definition}
      error={error}
      hint={definition.config?.hint}
      showLabel={!inline}
    >
      {(controlProps) => (
        <div className='flex items-center gap-0.5' {...controlProps}>
          {Array.from({ length: maxStars }).map((_, index) => {
            const star = index + 1;
            const active = star <= current;
            return (
              <button
                key={star}
                type='button'
                disabled={isReadOnly}
                onClick={() => onChange(star === current ? 0 : star)}
                aria-label={`${star} de ${maxStars}`}
                className={
                  isReadOnly
                    ? 'cursor-not-allowed p-0'
                    : 'p-0 transition-colors'
                }
              >
                <Star
                  className={
                    active
                      ? 'fill-amber-400 text-amber-400 h-4 w-4'
                      : 'text-muted-foreground/30 h-4 w-4'
                  }
                />
              </button>
            );
          })}
        </div>
      )}
    </FieldShell>
  );
}
