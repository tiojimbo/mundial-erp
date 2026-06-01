'use client';

import { useEffect, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { ChevronDown, ChevronUp, Clock, Maximize2 } from 'lucide-react';

import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import type { TaskDescriptionProps } from './task-description';
import { ptBrErp } from './blocknote-ptbr';
import './task-description.css';

const COLLAPSED_MAX_HEIGHT = 200;

export default function TaskDescriptionEditor({
  value,
  onChange,
  readOnly,
  autoFocus,
  'aria-label': ariaLabel,
}: TaskDescriptionProps) {
  const editor = useCreateBlockNote({ dictionary: ptBrErp });
  const initialized = useRef(false);
  const editorBoxRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

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

  useEffect(() => {
    const check = () => {
      const el = editorBoxRef.current?.querySelector(
        '.bn-editor',
      ) as HTMLElement | null;
      if (!el) return;
      setNeedsCollapse(el.scrollHeight > COLLAPSED_MAX_HEIGHT + 20);
    };
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, []);

  const persist = useDebouncedCallback(async () => {
    if (!onChange) return;
    const html = await editor.blocksToHTMLLossy(editor.document);
    onChange(html);
  }, 300);

  const collapsed = needsCollapse && !expanded;

  return (
    <div className='cu-desc-editor-wrap group relative px-0'>
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
      <div
        ref={editorBoxRef}
        className={collapsed ? 'cu-desc-collapsed' : undefined}
        style={
          collapsed
            ? { maxHeight: COLLAPSED_MAX_HEIGHT, overflow: 'hidden' }
            : undefined
        }
      >
        <BlockNoteView
          editor={editor}
          editable={!readOnly}
          onChange={persist}
          aria-label={ariaLabel}
        />
      </div>
      {needsCollapse && (
        <div className='flex justify-center pt-2'>
          <button
            type='button'
            onClick={() => setExpanded(!expanded)}
            className='text-paragraph-xs hover:bg-bg-weak-100 flex items-center gap-1 rounded px-3 py-1 text-text-sub-600'
          >
            {expanded ? (
              <ChevronUp className='h-3 w-3' />
            ) : (
              <ChevronDown className='h-3 w-3' />
            )}
            {expanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>
      )}
    </div>
  );
}
