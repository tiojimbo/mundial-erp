'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import {
  AtSign,
  Code2,
  Mic,
  Paperclip,
  Send,
  Smile,
  Sparkles,
  UserPlus,
} from 'lucide-react';

import { useTasksStore } from '../../../stores/tasks.store';

/**
 * Sprint 5 (TSK-150) — Comment composer.
 * tasks.md §5.3 — "use client" + dynamic BlockNote. min-h-44 + IconButtons.
 * Teclado: Enter envia, Shift+Enter quebra, Esc limpa.
 * Draft persiste em Zustand (TODO Sprint 5.1: estender store com `drafts`).
 *
 * Integra com `useCreateComment(taskId)` (Henrique).
 * BlockNote carregado dinamicamente (peso ~180kb gzip — PLANO §11.1).
 */

const BlockNoteEditor = dynamic<{
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}>(
  async () => {
    // TODO Sprint 5.1: import real de @blocknote/react.
    const Fallback = ({
      value,
      onChange,
      placeholder,
    }: {
      value: string;
      onChange: (next: string) => void;
      placeholder?: string;
    }) => (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Escrever comentario"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:italic placeholder:text-muted-foreground"
        rows={2}
      />
    );
    return { default: Fallback };
  },
  { ssr: false },
);

export type CommentComposerProps = {
  taskId: string;
  onSubmit?: (body: string) => Promise<void> | void;
};

function IconBtn({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted"
    >
      {children}
    </button>
  );
}

export function CommentComposer({ taskId, onSubmit }: CommentComposerProps) {
  // TODO Sprint 5.1: ler/escrever em store.drafts[taskId]
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { activitiesPanelOpen } = useTasksStore();

  useEffect(() => {
    if (!activitiesPanelOpen) setValue('');
  }, [activitiesPanelOpen]);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(trimmed);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
    if (e.key === 'Escape') {
      setValue('');
    }
  }

  return (
    <footer
      className="space-y-2 border-t border-border/60 p-3"
      onKeyDown={handleKey}
    >
      <div className="min-h-[44px]">
        <BlockNoteEditor
          value={value}
          onChange={setValue}
          placeholder="Digite texto ou use '/' para comandos"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconBtn label="Emoji">
            <Smile className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Anexar arquivo">
            <Paperclip className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Gravar audio">
            <Mic className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Mencionar">
            <AtSign className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Atribuir">
            <UserPlus className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Codigo">
            <Code2 className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="IA">
            <Sparkles className="h-4 w-4" />
          </IconBtn>
        </div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!value.trim() || submitting}
          aria-label="Enviar comentario"
          data-task-id={taskId}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-primary px-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          Comentar
        </button>
      </div>
    </footer>
  );
}
