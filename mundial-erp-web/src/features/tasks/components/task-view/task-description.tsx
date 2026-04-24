'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Sprint 0 (TSK-102 foundation) — prova-de-conceito de lazy-load do BlockNote
 * conforme PLANO-TASKS.md §11.1 (peso ~180kb gzip) e CTO note #4
 * (Lighthouse bloqueante em CI).
 *
 * Regras:
 *   - `dynamic({ ssr: false })` obrigatorio: BlockNote depende de `window`.
 *   - Fallback SSR deve renderizar o conteudo markdown em `prose` simples
 *     para que usuarios sem JS ainda leiam a descricao (A11y, PLANO §10.9).
 *   - Editor real (slash menu, Maximize2, collab) entra na Sprint 5 (TSK-150).
 *
 * TODO Sprint 5 (TSK-150):
 *   - Integrar com `DOMPurify` na leitura (§8.10).
 *   - Botao Maximize2 (§10.5 linha 5).
 *   - Sincronizar `value` via `useUpdateTask` com debounce 300ms (§11.2).
 */

export type TaskDescriptionProps = {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  'aria-label'?: string;
};

type BlockNoteEditorProps = TaskDescriptionProps;

function TaskDescriptionFallback({ value }: TaskDescriptionProps) {
  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      aria-label="Descricao da tarefa (edicao indisponivel sem JavaScript)"
    >
      {value ? (
        value
      ) : (
        <span className="text-muted-foreground">Sem descricao.</span>
      )}
    </div>
  );
}

/**
 * Lazy wrapper — carrega o editor BlockNote apenas no cliente.
 * Modulo alvo sera criado em Sprint 5 no arquivo `./task-description-editor.tsx`.
 * Enquanto nao existir, caimos no fallback.
 */
const TaskDescriptionEditor: ComponentType<BlockNoteEditorProps> = dynamic(
  async () => {
    // TODO Sprint 5: trocar por `import('./task-description-editor')` real.
    return { default: TaskDescriptionFallback };
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="prose prose-sm max-w-none animate-pulse text-muted-foreground"
        aria-live="polite"
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
