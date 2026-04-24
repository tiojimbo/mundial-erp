import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskAttachmentsService } from '../services/task-attachments.service';
import { taskQueryKeys } from '../lib/query-keys';
import { useWorkspaceId } from '../lib/use-workspace-id';
import type { TaskAttachment } from '../types/task.types';

type Vars = {
  taskId: string;
  file: File;
  /** Opcional — usado em onProgress no callsite (axios `onUploadProgress` pode ser adicionado aqui quando necessario). */
  onProgress?: (fraction: number) => void;
};

/**
 * Upload de attachment — fluxo 3-step (PLANO §7.3, §8.10).
 *
 * 1. `attachments/signed-url` — obtem URL PUT pre-assinada (TTL 5 min).
 * 2. PUT direto a storage (S3-compatible) — bypassa o backend (banda).
 * 3. `attachments` (register) — registra o arquivo; backend enfileira scan ClamAV.
 *
 * O item aparece com `scanStatus=PENDING`; UI bloqueia download ate `CLEAN`.
 */
export function useUploadAttachment() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation<TaskAttachment, Error, Vars>({
    mutationKey: [workspaceId, 'tasks', 'attachments', 'upload'],
    mutationFn: async ({ taskId, file, onProgress }) => {
      // Step 1: signed URL.
      const signed = await taskAttachmentsService.requestSignedUrl(taskId, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      onProgress?.(0.1);

      // Step 2: PUT direto.
      await taskAttachmentsService.uploadToSignedUrl(signed.uploadUrl, file);
      onProgress?.(0.8);

      // Step 3: register.
      const registered = await taskAttachmentsService.register(taskId, {
        storageKey: signed.storageKey,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      onProgress?.(1);
      return registered;
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({
        queryKey: taskQueryKeys.attachments(workspaceId, taskId),
      });
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao enviar arquivo');
    },
  });
}
