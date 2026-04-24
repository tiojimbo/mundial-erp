'use client';

import { useState, type DragEvent } from 'react';
import { Paperclip } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { TaskDetail } from '../../types/task.types';

import { AttachmentsGrid } from './attachments-grid';
import { CollapsibleSection } from './collapsible-section';

/**
 * Sprint 5 (TSK-150) — Secao de anexos com dropzone.
 * tasks.md §4.12 — border-dashed py-6. Drag-over: border-primary + bg primary/5.
 *
 * Flow via `useUploadAttachment` (3 etapas: signed URL -> PUT S3 -> confirm).
 * TODO: integrar hook real do Henrique (nao exportado ainda).
 */

export type AttachmentsSectionProps = {
  task: TaskDetail;
};

export function AttachmentsSection({ task }: AttachmentsSectionProps) {
  const attachments = task.attachments ?? [];
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    // TODO: delegar para useUploadAttachment
  }

  return (
    <CollapsibleSection
      sectionKey="attachments"
      title="Anexos"
      icon={<Paperclip className="h-4 w-4" />}
      counter={attachments.length > 0 ? attachments.length : undefined}
    >
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'block cursor-pointer rounded-lg border border-dashed py-6 text-center text-sm transition-colors duration-150',
          isDragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border/60 text-muted-foreground hover:bg-muted/40',
        )}
      >
        <input
          type="file"
          multiple
          hidden
          aria-label="Selecionar arquivos para anexar"
          onChange={() => {
            // TODO: delegar para useUploadAttachment
          }}
        />
        Solte seus arquivos aqui para <span className="underline">anexar</span>
      </label>
      <AttachmentsGrid items={attachments} />
    </CollapsibleSection>
  );
}
