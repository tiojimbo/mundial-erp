'use client';

import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Paperclip } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { TaskDetail } from '../../types/task.types';
import type { TaskTypeTemplateAttachmentCategory } from '../../hooks/use-task-type-template';
import { useUploadAttachment } from '../../hooks/use-upload-attachment';

import { AttachmentsGrid } from './attachments-grid';
import { CollapsibleSection } from './collapsible-section';

/**
 * Sprint 5 (TSK-150) — Secao de anexos com dropzone.
 * tasks.md §4.12 — border-dashed py-6. Drag-over: border-primary + bg primary/5.
 *
 * Sprint 4 (TTT-043) — Quando o `CustomTaskType` da task tem template com
 * `attachmentCategories`, renderiza chips logo abaixo do dropzone indicando
 * cada categoria. Estado `attached` calculado dinamicamente via
 * `attachments.some(a => a.category === slug)` (backend persiste `category`
 * desde 20260506_000013_attachment_category).
 *
 * Fluxo de upload por chip:
 *   1. Usuario clica num chip -> guarda `pendingCategory` em ref + abre file picker.
 *   2. `<input onChange>` -> dispara `useUploadAttachment` com `category` no payload.
 *   3. Backend valida slug contra template (400 se invalido), insere com `category`.
 *   4. React Query invalida cache; chip recalcula e fica verde.
 *
 * Drop direto na dropzone (sem chip) -> upload sem categoria.
 */

export type AttachmentsSectionProps = {
  task: TaskDetail;
  /**
   * Categorias derivadas do `TaskTypeTemplate` da task. `null` quando o tipo
   * nao tem template ou nao define categorias — sem chips.
   */
  categories?: TaskTypeTemplateAttachmentCategory[] | null;
};

export function AttachmentsSection({
  task,
  categories,
}: AttachmentsSectionProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const attachments = task.attachments ?? [];
  const [isDragging, setIsDragging] = useState(false);
  const upload = useUploadAttachment();

  const inputId = `attachments-input-${task.id}`;
  /**
   * Categoria escolhida via chip antes do file picker abrir. Usamos `ref` ao
   * inves de state porque o `onChange` do input nao recebe a categoria como
   * parametro — precisamos lela sincronicamente sem trigger de re-render.
   */
  const pendingCategoryRef = useRef<string | null>(null);

  /**
   * Set de slugs ja anexados (deduplica multiplos arquivos na mesma categoria).
   * O lookup em chip O(1) evita varrer `attachments` por chip — mesmo padrao
   * do PLANO §"Performance — Identifique o hot path".
   */
  const attachedSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const a of attachments) {
      if (a.category) set.add(a.category);
    }
    return set;
  }, [attachments]);

  function uploadFile(file: File, category: string | null) {
    upload.mutate({ taskId: task.id, file, category });
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    // Drop direto = sem categoria. Upload paralelo de cada arquivo.
    for (const file of files) uploadFile(file, null);
  }

  function focusUpload(categorySlug: string) {
    pendingCategoryRef.current = categorySlug;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.click();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const category = pendingCategoryRef.current;
    pendingCategoryRef.current = null;
    // Reseta o input pra permitir reanexar o mesmo arquivo na mesma sessao.
    e.target.value = '';
    if (files.length === 0) return;
    for (const file of files) uploadFile(file, category);
  }

  const hasCategories =
    Array.isArray(categories) && categories && categories.length > 0;

  return (
    <CollapsibleSection
      sectionKey='attachments'
      title='Anexos'
      icon={<Paperclip className='h-4 w-4' />}
      counter={attachments.length > 0 ? attachments.length : undefined}
    >
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'text-sm block cursor-pointer rounded-lg border border-dashed py-6 text-center transition-colors duration-150',
          isDragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
        )}
      >
        <input
          id={inputId}
          type='file'
          multiple
          hidden
          aria-label='Selecionar arquivos para anexar'
          onChange={handleInputChange}
        />
        Solte seus arquivos aqui para <span className='underline'>anexar</span>
      </label>

      {hasCategories && (
        <ul
          aria-label='Categorias de anexo do tipo de tarefa'
          className='flex flex-wrap gap-1.5'
        >
          {categories.map((cat) => (
            <CategoryChip
              key={cat.slug}
              category={cat}
              attached={attachedSlugs.has(cat.slug)}
              onActivate={() => focusUpload(cat.slug)}
            />
          ))}
        </ul>
      )}

      <AttachmentsGrid items={attachments} />
    </CollapsibleSection>
  );
}

type CategoryChipProps = {
  category: TaskTypeTemplateAttachmentCategory;
  attached: boolean;
  onActivate: () => void;
};

/**
 * Chip de categoria de anexo (TTT-043).
 *
 * Estados visuais:
 *   - `attached`            → fundo verde (success), checkmark `OK`.
 *   - `required && !attached` → borda vermelha (destructive) com sufixo
 *                                "(obrigatorio)".
 *   - opcional + sem anexo  → outline neutro.
 *
 * A11y: `role="button"`, `aria-label` legivel ("Categoria X, obrigatoria,
 * pendente"), foco visivel + Enter/Space ativando o upload.
 */
function CategoryChip({ category, attached, onActivate }: CategoryChipProps) {
  const requiredText = category.required ? 'obrigatoria' : 'opcional';
  const stateText = attached ? 'anexado' : 'pendente';

  const tone = attached
    ? 'border-success-base bg-success-light text-success-dark'
    : category.required
      ? 'border-error-base text-error-base'
      : 'border-border/60 text-muted-foreground';

  return (
    <li>
      <button
        type='button'
        role='button'
        aria-label={`Categoria ${category.label}, ${requiredText}, ${stateText}`}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
          'focus-visible:ring-primary/40 focus-visible:outline-none focus-visible:ring-2',
          tone,
        )}
      >
        <span>{category.label}</span>
        {category.required && !attached && (
          <span aria-hidden='true' className='opacity-80'>
            (obrigatorio)
          </span>
        )}
        {attached && (
          <span aria-hidden='true' className='font-semibold'>
            OK
          </span>
        )}
      </button>
    </li>
  );
}
