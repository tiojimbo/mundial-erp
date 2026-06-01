'use client';

import { useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { Clock, Maximize2 } from 'lucide-react';

import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import type { TaskDescriptionProps } from './task-description';
import { ptBrErp } from './blocknote-ptbr';
import './task-description.css';

export default function TaskDescriptionEditor({
  value,
  onChange,
  readOnly,
  autoFocus,
  'aria-label': ariaLabel,
}: TaskDescriptionProps) {
  const editor = useCreateBlockNote({ dictionary: ptBrErp });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      const blocks = value
        ? await editor.tryParseHTMLToBlocks(value)
        : [{ type: 'paragraph' as const }];
      editor.replaceBlocks(editor.document, blocks);
      if (autoFocus) editor.focus();
    })();
  }, [editor, value, autoFocus]);

  const persist = useDebouncedCallback(async () => {
    if (!onChange) return;
    const html = await editor.blocksToHTMLLossy(editor.document);
    onChange(html);
  }, 300);

  return (
    <div className='cu-desc-editor-wrap group relative min-h-[108px] px-0'>
      <div className='absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
        <button
          type='button'
          aria-label='Historico de edicoes'
          className='text-text-soft-400 hover:bg-bg-weak-100 flex h-7 w-7 items-center justify-center rounded'
        >
          <Clock className='h-4 w-4' />
        </button>
        <button
          type='button'
          aria-label='Expandir tela cheia'
          className='text-text-soft-400 hover:bg-bg-weak-100 flex h-7 w-7 items-center justify-center rounded'
        >
          <Maximize2 className='h-4 w-4' />
        </button>
      </div>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={persist}
        aria-label={ariaLabel}
      />
    </div>
  );
}
