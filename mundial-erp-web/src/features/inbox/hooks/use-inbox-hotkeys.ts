'use client';

import { useEffect, useRef, useCallback } from 'react';

type UseInboxHotkeysProps = {
  onClear: (id: string) => void;
  onClearAll: () => void;
  items: Array<{ id: string }>;
  enabled?: boolean;
};

export function useInboxHotkeys({
  onClear,
  onClearAll,
  items,
  enabled = true,
}: UseInboxHotkeysProps) {
  const focusIndexRef = useRef(-1);

  const getFocusableItems = useCallback(() => {
    return document.querySelectorAll<HTMLElement>('[data-notification-id]');
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore when dialog/popover is open
      if (
        document.querySelector('[role="dialog"]') ||
        document.querySelector('[role="alertdialog"]')
      ) {
        return;
      }

      const focusableItems = getFocusableItems();

      switch (e.key) {
        case 'e':
        case 'E': {
          if (e.shiftKey) {
            // Shift+E: Clear all with confirmation
            e.preventDefault();
            onClearAll();
          } else {
            // E: Clear focused/hovered item
            e.preventDefault();
            const hoveredItem = document.querySelector(
              '[data-notification-id]:hover',
            ) as HTMLElement;
            const focusedItem = focusableItems[
              focusIndexRef.current
            ] as HTMLElement;
            const targetItem = hoveredItem || focusedItem;
            if (targetItem) {
              const id = targetItem.dataset.notificationId;
              if (id) onClear(id);
            }
          }
          break;
        }
        case 'j':
        case 'J': {
          // Next item
          e.preventDefault();
          if (focusableItems.length === 0) return;
          focusIndexRef.current = Math.min(
            focusIndexRef.current + 1,
            focusableItems.length - 1,
          );
          focusableItems[focusIndexRef.current]?.focus();
          break;
        }
        case 'k':
        case 'K': {
          // Previous item
          e.preventDefault();
          if (focusableItems.length === 0) return;
          focusIndexRef.current = Math.max(focusIndexRef.current - 1, 0);
          focusableItems[focusIndexRef.current]?.focus();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onClear, onClearAll, getFocusableItems]);

  // Reset focus index when items change
  useEffect(() => {
    focusIndexRef.current = -1;
  }, [items]);
}
