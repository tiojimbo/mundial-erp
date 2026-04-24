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
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TaskTemplatesService } from './task-templates.service';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import { TemplateResponseDto } from './dtos/template-response.dto';
import {
  InstantiateTemplateDto,
  InstantiateTemplateResponseDto,
} from './dtos/instantiate-template.dto';
import { SnapshotTemplateQueryDto } from './dtos/snapshot-template.dto';
import { TemplatePayloadValidatorPipe } from './pipes/template-payload.validator';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { TemplateFiltersDto } from './dtos/template-filters.dto';

/**
 * Controller de `WorkItemTemplate` — PLANO-TASKS.md §7.3 (Task Templates).
 *
 * Rotas registradas com guards/roles/rate-limit. O pipe
 * `TemplatePayloadValidatorPipe` valida o payload em create/update (200 nodes
 * + depth 3). Sprint 6 completo: sem stubs 501.
 */
@ApiTags('Task Templates')
@ApiBearerAuth()
@Controller()
export class TaskTemplatesController {
  constructor(private readonly service: TaskTemplatesService) {}

  @Get('task-templates')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar templates do workspace' })
  @ApiResponse({ status: 200 })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filters: TemplateFiltersDto,
  ) {
    return this.service.findAll(workspaceId, filters);
  }

  @Post('task-templates')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UsePipes(TemplatePayloadValidatorPipe)
  @ApiOperation({ summary: 'Criar template' })
  @ApiResponse({ status: 201, type: TemplateResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(workspaceId, dto, user.sub);
  }

  @Get('task-templates/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obter template por id' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.findOne(workspaceId, id);
  }

  @Patch('task-templates/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UsePipes(TemplatePayloadValidatorPipe)
  @ApiOperation({ summary: 'Atualizar template' })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(workspaceId, id, dto, user.sub);
  }

  @Delete('task-templates/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Remover template (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(workspaceId, id, user.sub);
  }

  @Post('task-templates/:id/snapshot')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Capturar subtree de uma task como novo payload do template',
  })
  @ApiResponse({ status: 200, type: TemplateResponseDto })
  snapshot(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Query() query: SnapshotTemplateQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.snapshot(workspaceId, id, query, user.sub);
  }

  @Post('processes/:processId/task-templates/:templateId/instances')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Instanciar template como WorkItem + subtree' })
  @ApiResponse({ status: 201, type: InstantiateTemplateResponseDto })
  instantiate(
    @WorkspaceId() workspaceId: string,
    @Param('processId') processId: string,
    @Param('templateId') templateId: string,
    @Body() dto: InstantiateTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.instantiate(
      workspaceId,
      processId,
      templateId,
      dto,
      user.sub,
    );
  }
}
