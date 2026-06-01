'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

export type TaskDescriptionProps = {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
};

function TaskDescriptionFallback({ value }: TaskDescriptionProps) {
  return (
    <div
      className='text-paragraph-sm prose max-w-none text-text-sub-600'
      aria-label='Descricao da tarefa (edicao indisponivel sem JavaScript)'
      dangerouslySetInnerHTML={{
        __html: value || '<p><em>Sem descricao.</em></p>',
      }}
    />
  );
}

const TaskDescriptionEditor = dynamic(
  () => import('./task-description-editor'),
  {
    ssr: false,
    loading: () => (
      <div
        className='text-paragraph-xs animate-pulse text-text-soft-400'
        aria-live='polite'
      >
        Carregando editor...
      </div>
    ),
  },
);

function isEmpty(html: string | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, '').trim().length === 0;
}

export function TaskDescription(props: TaskDescriptionProps) {
  const [editing, setEditing] = useState(() => !isEmpty(props.value));

  if (!editing && !props.readOnly) {
    return (
      <button
        type='button'
        onClick={() => setEditing(true)}
        className='cu-desc-editor-wrap text-paragraph-sm block w-full cursor-text px-0 text-left text-text-soft-400 transition-colors hover:text-text-sub-600'
      >
        Adicione uma descricao
      </button>
    );
  }

  return (
    <>
      <noscript>
        <TaskDescriptionFallback {...props} />
      </noscript>
      <TaskDescriptionEditor {...props} autoFocus={editing && !props.autoFocus ? true : props.autoFocus} />
    </>
  );
}
