import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import {
  RegisterAttachmentDto,
  RegisterAttachmentLegacyDto,
} from './dtos/register-attachment.dto';
import {
  AttachmentResponseDto,
  DownloadUrlResponseDto,
  SignedUrlResponseDto,
} from './dtos/attachment-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller()
export class TaskAttachmentsController {
  constructor(private readonly service: TaskAttachmentsService) {}

  @Post('attachments/presigned-url')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Obter presigned URL PUT para upload (TTL 300s).',
  })
  @ApiResponse({ status: 201, type: SignedUrlResponseDto })
  createSignedUrl(
    @WorkspaceId() workspaceId: string,
    @Body() dto: SignedUrlRequestDto,
  ): Promise<SignedUrlResponseDto> {
    return this.service.createSignedUrl(workspaceId, dto.taskId, dto);
  }

  @Post('attachments/signed-url')
  @Header('Deprecation', 'true')
  @Header('Link', '</attachments/presigned-url>; rel="successor-version"')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'DEPRECATED. Alias de POST /attachments/presigned-url.',
    deprecated: true,
  })
  @ApiResponse({ status: 201, type: SignedUrlResponseDto })
  createSignedUrlLegacy(
    @WorkspaceId() workspaceId: string,
    @Body() dto: SignedUrlRequestDto,
  ): Promise<SignedUrlResponseDto> {
    return this.service.createSignedUrl(workspaceId, dto.taskId, dto);
  }

  @Post('attachments/tasks/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Registrar anexo pos-upload (taskId no path). scanStatus=PENDING ate ClamAV liberar.',
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

  @Post('attachments')
  @Header('Deprecation', 'true')
  @Header('Link', '</attachments/tasks/{taskId}>; rel="successor-version"')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'DEPRECATED. Use POST /attachments/tasks/:taskId. Aceita taskId no body.',
    deprecated: true,
  })
  @ApiResponse({ status: 201, type: AttachmentResponseDto })
  registerLegacy(
    @WorkspaceId() workspaceId: string,
    @Body() dto: RegisterAttachmentLegacyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AttachmentResponseDto> {
    return this.service.register(workspaceId, dto.taskId, dto, user.sub);
  }

  @Get('tasks/:taskId/documents')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar anexos da tarefa (paridade Hoppe)' })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Get('attachments/tasks/:taskId')
  @Header('Deprecation', 'true')
  @Header('Link', '</tasks/{taskId}/documents>; rel="successor-version"')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'DEPRECATED. Use GET /tasks/:taskId/documents (paridade Hoppe).',
    deprecated: true,
  })
  findByTaskAttachmentsPath(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Get('attachments/task/:taskId')
  @Header('Deprecation', 'true')
  @Header('Link', '</tasks/{taskId}/documents>; rel="successor-version"')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'DEPRECATED. Use GET /tasks/:taskId/documents (paridade Hoppe).',
    deprecated: true,
  })
  findByTaskLegacy(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Get('attachments/:id/download-url')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Signed GET URL (TTL 300s) — exige scanStatus=CLEAN',
  })
  @ApiResponse({ status: 200, type: DownloadUrlResponseDto })
  @ApiResponse({ status: 403, description: 'Scan PENDING ou INFECTED' })
  getDownloadUrl(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<DownloadUrlResponseDto> {
    return this.service.getDownloadUrl(workspaceId, id);
  }

  @Delete('attachments/:id')
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
