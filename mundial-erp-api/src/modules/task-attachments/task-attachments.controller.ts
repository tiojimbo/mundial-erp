import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskAttachmentsService } from './task-attachments.service';
import { SignedUrlRequestDto } from './dtos/signed-url-request.dto';
import { RegisterAttachmentDto } from './dtos/register-attachment.dto';
import {
  AttachmentResponseDto,
  DownloadUrlResponseDto,
  SignedUrlResponseDto,
} from './dtos/attachment-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de WorkItemAttachment (PLANO §7.3, §8.10).
 *
 * Fluxo de upload em 3 etapas:
 *   1) POST /tasks/:taskId/attachments/signed-url — obtem signed PUT URL (TTL 300s).
 *   2) Cliente faz PUT direto no bucket privado.
 *   3) POST /tasks/:taskId/attachments — registra metadata + enfileira scan.
 */
@ApiTags('Task Attachments')
@ApiBearerAuth()
@Controller()
export class TaskAttachmentsController {
  constructor(private readonly service: TaskAttachmentsService) {}

  @Post('tasks/:taskId/attachments/signed-url')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obter signed URL PUT para upload (TTL 300s)' })
  @ApiResponse({ status: 201, type: SignedUrlResponseDto })
  createSignedUrl(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: SignedUrlRequestDto,
  ): Promise<SignedUrlResponseDto> {
    return this.service.createSignedUrl(workspaceId, taskId, dto);
  }

  @Post('tasks/:taskId/attachments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Registrar anexo pos-upload (scanStatus=PENDING ate ClamAV liberar)',
  })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  register(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: RegisterAttachmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AttachmentResponseDto> {
    return this.service.register(workspaceId, taskId, dto, user.sub);
  }

  @Get('tasks/:taskId/attachments')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar anexos da tarefa' })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Get('task-attachments/:id/download-url')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Signed GET URL (TTL 300s) — exige scanStatus=CLEAN' })
  @ApiResponse({ status: 200, type: DownloadUrlResponseDto })
  @ApiResponse({ status: 403, description: 'Scan PENDING ou INFECTED' })
  getDownloadUrl(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<DownloadUrlResponseDto> {
    return this.service.getDownloadUrl(workspaceId, id);
  }

  @Delete('task-attachments/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover anexo (Manager+) — soft delete + S3' })
  @ApiResponse({ status: 204 })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.remove(workspaceId, id, {
      userId: user.sub,
      role: user.role as Role,
    });
  }
}
