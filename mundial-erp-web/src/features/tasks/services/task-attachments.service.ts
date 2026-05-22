import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  TaskAttachment,
  AttachmentSignedUrlRequest,
  AttachmentSignedUrlResponse,
  AttachmentUploadDto,
} from '../types/task.types';

export const taskAttachmentsService = {
  async list(taskId: string): Promise<TaskAttachment[]> {
    const { data } = await api.get<ApiResponse<TaskAttachment[]>>(
      `/tasks/${taskId}/documents`,
    );
    return data.data;
  },

  async requestSignedUrl(
    taskId: string,
    payload: AttachmentSignedUrlRequest,
  ): Promise<AttachmentSignedUrlResponse> {
    const { data } = await api.post<ApiResponse<AttachmentSignedUrlResponse>>(
      '/attachments/presigned-url',
      { taskId, ...payload },
    );
    return data.data;
  },

  async register(
    taskId: string,
    payload: AttachmentUploadDto,
  ): Promise<TaskAttachment> {
    const { data } = await api.post<ApiResponse<TaskAttachment>>(
      `/attachments/tasks/${taskId}`,
      payload,
    );
    return data.data;
  },

  async getDownloadUrl(_taskId: string, attachmentId: string): Promise<string> {
    const { data } = await api.get<ApiResponse<{ url: string }>>(
      `/attachments/${attachmentId}/download-url`,
    );
    return data.data.url;
  },

  async remove(_taskId: string, attachmentId: string): Promise<void> {
    await api.delete(`/attachments/${attachmentId}`);
  },

  async uploadToSignedUrl(uploadUrl: string, file: File): Promise<void> {
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
