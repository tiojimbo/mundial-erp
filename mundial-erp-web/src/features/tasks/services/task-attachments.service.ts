import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  TaskAttachment,
  AttachmentSignedUrlRequest,
  AttachmentSignedUrlResponse,
  AttachmentUploadDto,
} from '../types/task.types';

/**
 * Attachments — PLANO-TASKS.md §7.3 e §8.10.
 *
 * Fluxo:
 * 1. POST /tasks/:taskId/attachments/signed-url  → uploadUrl (TTL 5 min, PUT)
 * 2. PUT  uploadUrl (client → storage direto)    → 200 OK
 * 3. POST /tasks/:taskId/attachments             → registrar pos-upload
 * 4. Download: GET /tasks/:taskId/attachments/:attachmentId/download-url (bloqueado se scan != CLEAN)
 */
export const taskAttachmentsService = {
  async list(taskId: string): Promise<TaskAttachment[]> {
    const { data } = await api.get<ApiResponse<TaskAttachment[]>>(
      `/tasks/${taskId}/attachments`,
    );
    return data.data;
  },

  async requestSignedUrl(
    taskId: string,
    payload: AttachmentSignedUrlRequest,
  ): Promise<AttachmentSignedUrlResponse> {
    const { data } = await api.post<ApiResponse<AttachmentSignedUrlResponse>>(
      `/tasks/${taskId}/attachments/signed-url`,
      payload,
    );
    return data.data;
  },

  async register(
    taskId: string,
    payload: AttachmentUploadDto,
  ): Promise<TaskAttachment> {
    const { data } = await api.post<ApiResponse<TaskAttachment>>(
      `/tasks/${taskId}/attachments`,
      payload,
    );
    return data.data;
  },

  async getDownloadUrl(taskId: string, attachmentId: string): Promise<string> {
    const { data } = await api.get<ApiResponse<{ url: string }>>(
      `/tasks/${taskId}/attachments/${attachmentId}/download-url`,
    );
    return data.data.url;
  },

  async remove(taskId: string, attachmentId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },

  /**
   * Upload direto a uma signed-url PUT (S3-compatible). Usa fetch nativo
   * porque axios inclui headers extras que podem invalidar a assinatura.
   */
  async uploadToSignedUrl(
    uploadUrl: string,
    file: File,
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok) {
      throw new Error(
        `Falha no upload direto (${response.status} ${response.statusText}).`,
      );
    }
  },
};
