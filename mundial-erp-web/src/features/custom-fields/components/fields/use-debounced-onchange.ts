'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Sprint 2 (TTT-021) — Hook de debounce 500ms compartilhado.
 *
 * `use-debounce` nao esta nas dependencias do projeto; implementamos com
 * `useRef + setTimeout` conforme orientacao do prompt. Cada editor expoe um
 * `onChange(rawValue)` que cancela o timer anterior e dispara o callback do
 * pai apos 500ms de inatividade — alinhado ao `TaskTitle` da Sprint 5
 * existente em `features/tasks/components/task-view/task-title.tsx`.
 *
 * Cleanup no unmount evita vazamento (e race com unmount + invalidate que
 * causaria warning "perform a state update on an unmounted component").
 */
export const CUSTOM_FIELD_DEBOUNCE_MS = 500;

export function useDebouncedOnChange<T>(
  onChange: (value: T) => void,
  delay: number = CUSTOM_FIELD_DEBOUNCE_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onChange);

  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (value: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(value);
      }, delay);
    },
    [delay],
  );
}
