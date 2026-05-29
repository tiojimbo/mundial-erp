import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskChecklistsService } from './task-checklists.service';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { ChecklistResponseDto } from './dtos/checklist-response.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de WorkItemChecklist no padrao Hoppe (paths singulares):
 * - `/checklist/task/:taskId` — listar/criar em uma task
 * - `/checklist/:id`          — atualizar/remover
 * - `/checklist/item/...`     — items (HPP-081)
 */
@ApiTags('Task Checklists')
@ApiBearerAuth()
@Controller()
export class TaskChecklistsController {
  constructor(private readonly service: TaskChecklistsService) {}

  @Get('checklist/task/:taskId')
  @ApiOperation({ summary: 'Listar checklists de uma tarefa' })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Post('checklist/task/:taskId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar checklist em uma tarefa' })
  @ApiResponse({ status: 201, type: ChecklistResponseDto })
  createChecklist(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.service.createChecklist(workspaceId, taskId, dto);
  }

  @Put('checklist/:id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Editar checklist' })
  @ApiResponse({ status: 200, type: ChecklistResponseDto })
  updateChecklist(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.service.updateChecklist(workspaceId, id, dto);
  }

  @Delete('checklist/:id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover checklist (soft delete + itens)' })
  @ApiResponse({ status: 204 })
  removeChecklist(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.removeChecklist(workspaceId, id);
  }

  @Post('checklist/item/:checklistId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar item em uma checklist' })
  createItem(
    @WorkspaceId() workspaceId: string,
    @Param('checklistId') checklistId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createItem(workspaceId, checklistId, dto, user.sub);
  }

  @Put('checklist/:checklistId/item/:itemId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Editar item de checklist' })
  updateItem(
    @WorkspaceId() workspaceId: string,
    @Param('checklistId') checklistId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateItem(
      workspaceId,
      checklistId,
      itemId,
      dto,
      user.sub,
    );
  }

  @Delete('checklist/item/:itemId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item de checklist (soft delete)' })
  @ApiResponse({ status: 204 })
  removeItem(
    @WorkspaceId() workspaceId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.removeItem(workspaceId, itemId);
  }
}
