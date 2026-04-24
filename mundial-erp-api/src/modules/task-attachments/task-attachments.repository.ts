/**
 * Repositorio de WorkItemAttachment (PLANO §5.3).
 *
 * Escopo multi-tenant resolvido via `workItem.process.department.workspaceId`.
 * Cross-tenant -> 404 (service). Soft delete obrigatorio.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const ATTACHMENT_SELECT = {
  id: true,
  workItemId: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  scanStatus: true,
  uploadedBy: true,
  createdAt: true,
  deletedAt: true,
} as const;

export interface AttachmentCreateInput {
  workItemId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
}

@Injectable()
export class TaskAttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTaskInWorkspace(workspaceId: string, taskId: string) {
    return this.prisma.workItem.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        process: { department: { workspaceId } },
      },
      select: { id: true },
    });
  }

  async findByTask(workspaceId: string, taskId: string) {
    return this.prisma.workItemAttachment.findMany({
      where: {
        workItemId: taskId,
        deletedAt: null,
        workItem: { process: { department: { workspaceId } } },
      },
      orderBy: { createdAt: 'desc' },
      select: ATTACHMENT_SELECT,
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.workItemAttachment.findFirst({
      where: {
        id,
        deletedAt: null,
        workItem: { process: { department: { workspaceId } } },
      },
      select: ATTACHMENT_SELECT,
    });
  }

  /**
   * Usado pelo ClamAV worker — sem escopo de workspace porque o job e disparado
   * pelo proprio sistema. NUNCA expor via controller.
   */
  async findByIdUnscoped(id: string) {
    return this.prisma.workItemAttachment.findFirst({
      where: { id, deletedAt: null },
      select: ATTACHMENT_SELECT,
    });
  }

  async create(input: AttachmentCreateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.workItemAttachment.create({
      data: {
        workItemId: input.workItemId,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        uploadedBy: input.uploadedBy,
        scanStatus: 'PENDING',
      },
      select: ATTACHMENT_SELECT,
    });
  }

  async updateScanStatus(id: string, scanStatus: string) {
    return this.prisma.workItemAttachment.update({
      where: { id },
      data: { scanStatus },
      select: ATTACHMENT_SELECT,
    });
  }

  async softDelete(id: string) {
    return this.prisma.workItemAttachment.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ATTACHMENT_SELECT,
    });
  }
}
