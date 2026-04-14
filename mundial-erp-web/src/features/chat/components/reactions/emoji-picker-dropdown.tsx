'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { EmojiStyle, Theme, SuggestionMode, Categories } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className='flex h-[400px] w-[350px] items-center justify-center rounded-xl border border-[#e7e7e7] bg-white'>
      <div className='size-6 animate-spin rounded-full border-2 border-[#e7e7e7] border-t-[#007aeb]' />
    </div>
  ),
});

type EmojiPickerDropdownProps = {
  onEmojiSelect: (emoji: string) => void;
  children: React.ReactNode;
};

export function EmojiPickerDropdown({
  onEmojiSelect,
  children,
}: EmojiPickerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const pickerWidth = 350;
      const pickerHeight = 400;

      // Garantir que fique dentro da viewport
      let top = rect.top - pickerHeight - 8;
      let left = rect.left;

      // Se sai por cima, posicionar abaixo
      if (top < 8) {
        top = rect.bottom + 8;
      }

      // Se sai pela direita, alinhar pela direita do trigger
      if (left + pickerWidth > window.innerWidth - 8) {
        left = rect.right - pickerWidth;
      }

      // Se sai pela esquerda
      if (left < 8) {
        left = 8;
      }

      setPosition({ top, left });
    }
    setOpen((prev) => !prev);
  }, [open]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <>
      <span ref={triggerRef} onClick={handleToggle}>
        {children}
      </span>

      {open &&
        createPortal(
          <div
            ref={pickerRef}
            className='fixed z-[100] rounded-md border border-[#e7e7e7] bg-white shadow-md'
            style={{ top: position.top, left: position.left }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              emojiStyle={EmojiStyle.APPLE}
              theme={Theme.LIGHT}
              width={350}
              height={400}
              searchPlaceHolder='Buscar emoji...'
              previewConfig={{
                defaultCaption: 'Como voce esta?',
                showPreview: true,
              }}
              suggestedEmojisMode={SuggestionMode.FREQUENT}
              skinTonesDisabled={false}
              lazyLoadEmojis
              categories={[
                { category: Categories.SUGGESTED, name: 'Usados recentemente' },
                { category: Categories.SMILEYS_PEOPLE, name: 'Smileys e Pessoas' },
                { category: Categories.ANIMALS_NATURE, name: 'Animais e Natureza' },
                { category: Categories.FOOD_DRINK, name: 'Comida e Bebida' },
                { category: Categories.TRAVEL_PLACES, name: 'Viagem e Lugares' },
                { category: Categories.ACTIVITIES, name: 'Atividades' },
                { category: Categories.OBJECTS, name: 'Objetos' },
                { category: Categories.SYMBOLS, name: 'Simbolos' },
                { category: Categories.FLAGS, name: 'Bandeiras' },
              ]}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
