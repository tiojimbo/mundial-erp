'use client';

import { useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';

import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import type { TaskDescriptionProps } from './task-description';

export default function TaskDescriptionEditor({
  value,
  onChange,
  readOnly,
  'aria-label': ariaLabel,
}: TaskDescriptionProps) {
  const editor = useCreateBlockNote();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      const blocks = value
        ? await editor.tryParseHTMLToBlocks(value)
        : [{ type: 'paragraph' as const }];
      editor.replaceBlocks(editor.document, blocks);
    })();
  }, [editor, value]);

  const persist = useDebouncedCallback(async () => {
    if (!onChange) return;
    const html = await editor.blocksToHTMLLossy(editor.document);
    onChange(html);
  }, 300);

  return (
    <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2'>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={persist}
        aria-label={ariaLabel}
      />
    </div>
  );
}
