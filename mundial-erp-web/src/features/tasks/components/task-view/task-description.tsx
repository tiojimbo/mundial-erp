'use client';

import dynamic from 'next/dynamic';

export type TaskDescriptionProps = {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
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

export function TaskDescription(props: TaskDescriptionProps) {
  return (
    <>
      <noscript>
        <TaskDescriptionFallback {...props} />
      </noscript>
      <TaskDescriptionEditor {...props} />
    </>
  );
}
