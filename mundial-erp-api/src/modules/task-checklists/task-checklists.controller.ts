import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { TaskChecklistsService } from './task-checklists.service';
import { CreateChecklistDto } from './dtos/create-checklist.dto';
import { UpdateChecklistDto } from './dtos/update-checklist.dto';
import { CreateChecklistItemDto } from './dtos/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dtos/update-checklist-item.dto';
import { ReorderChecklistItemsDto } from './dtos/reorder-checklist-items.dto';
import { ChecklistResponseDto } from './dtos/checklist-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de WorkItemChecklist (PLANO-TASKS.md §7.3).
 *
 * Duas familias de rota: nested em `/tasks/:taskId/checklists` para contexto
 * task-centrico, e flat em `/task-checklists/:id` para operacoes diretas
 * sobre a checklist/item.
 */
@ApiTags('Task Checklists')
@ApiBearerAuth()
@Controller()
export class TaskChecklistsController {
  constructor(private readonly service: TaskChecklistsService) {}

  @Get('tasks/:taskId/checklists')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar checklists de uma tarefa' })
  findByTask(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Post('tasks/:taskId/checklists')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
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

  @Patch('task-checklists/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Editar checklist' })
  @ApiResponse({ status: 200, type: ChecklistResponseDto })
  updateChecklist(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.service.updateChecklist(workspaceId, id, dto);
  }

  @Delete('task-checklists/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover checklist (soft delete + itens)' })
  @ApiResponse({ status: 204 })
  removeChecklist(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeChecklist(workspaceId, id);
  }

  @Post('task-checklists/:id/items')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar item em uma checklist' })
  createItem(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createItem(workspaceId, id, dto, user.sub);
  }

  @Patch('task-checklists/:id/items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Editar item de checklist' })
  updateItem(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateItem(workspaceId, id, itemId, dto, user.sub);
  }

  @Delete('task-checklists/:id/items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item de checklist (soft delete)' })
  @ApiResponse({ status: 204 })
  removeItem(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.removeItem(workspaceId, id, itemId);
  }

  @Post('task-checklists/:id/reorder')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reordenar itens (transacao unica)' })
  @ApiResponse({ status: 204 })
  reorderItems(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ReorderChecklistItemsDto,
  ) {
    return this.service.reorderItems(workspaceId, id, dto);
  }
}
