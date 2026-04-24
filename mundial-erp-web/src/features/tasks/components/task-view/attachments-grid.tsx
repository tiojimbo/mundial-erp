'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, Trash2 } from 'lucide-react';

import type { TaskAttachment } from '../../types/task.types';

import { ConfirmDialog } from './confirm-dialog';

/**
 * Sprint 5 (TSK-150) — AttachmentsGrid.
 * tasks.md §4.12 — grid com preview img/pdf + delete confirm.
 * Badges: "Escaneando..." quando PENDING; "Bloqueado" em INFECTED.
 */

export type AttachmentsGridProps = {
  items: TaskAttachment[];
  onDelete?: (id: string) => void;
};

export function AttachmentsGrid({ items, onDelete }: AttachmentsGridProps) {
  const [pendingDelete, setPendingDelete] = useState<TaskAttachment | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((att) => {
          const isImage = att.mimeType.startsWith('image/');
          const blocked = att.scanStatus === 'INFECTED';
          const scanning = att.scanStatus === 'PENDING';
          return (
            <li
              key={att.id}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-border/60"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-muted/40">
                {isImage && att.downloadUrl && !blocked ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.downloadUrl}
                    alt={att.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : isImage ? (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span
                  className="flex-1 truncate text-[11px] font-medium"
                  title={att.fileName}
                >
                  {att.fileName}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${att.fileName}`}
                  onClick={() => setPendingDelete(att)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {scanning && (
                <span className="absolute left-1 top-1 rounded bg-amber-500/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Escaneando...
                </span>
              )}
              {blocked && (
                <span className="absolute left-1 top-1 rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Bloqueado
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remover anexo"
        description={pendingDelete ? `Remover "${pendingDelete.fileName}"? Esta acao nao pode ser desfeita.` : ''}
        confirmText="Remover"
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            onDelete?.(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
}
