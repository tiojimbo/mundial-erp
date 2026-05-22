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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dtos/create-automation.dto';
import { UpdateAutomationDto } from './dtos/update-automation.dto';
import { ListAutomationsQueryDto } from './dtos/list-automations-query.dto';
import { AutomationResponseDto } from './dtos/automation-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@SkipResponseTransform()
@Controller('ai/automation')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  @Get('triggers')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar triggers disponíveis para Automations' })
  @ApiResponse({
    status: 200,
    description: 'Catálogo estático com 18 triggers',
  })
  listTriggers() {
    return this.service.listTriggers();
  }

  @Get('actions')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar actions disponíveis para Automations' })
  @ApiResponse({ status: 200, description: 'Catálogo estático com 21 actions' })
  listActions() {
    return this.service.listActions();
  }

  @Get('statuses')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar workflow statuses do workspace agrupados por escopo',
  })
  @ApiResponse({
    status: 200,
    description: '{ spaces: [...], folders: [...] }',
  })
  listStatuses(@WorkspaceId() workspaceId: string) {
    return this.service.listStatusesByScope(workspaceId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar Automations do workspace (filtros por query)',
  })
  @ApiResponse({ status: 200, type: [AutomationResponseDto] })
  list(
    @WorkspaceId() workspaceId: string,
    @Query() query: ListAutomationsQueryDto,
  ) {
    return this.service.list(workspaceId, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Detalhe de uma Automation' })
  @ApiResponse({ status: 200, type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.findById(workspaceId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar Automation' })
  @ApiResponse({ status: 201, type: AutomationResponseDto })
  @ApiResponse({ status: 400, description: 'Validação falhou' })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.service.create(workspaceId, user.sub, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar Automation (PUT aceita body parcial)' })
  @ApiResponse({ status: 200, type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation não encontrada' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.service.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Remover Automation (soft delete, retorna objeto deletado)',
  })
  @ApiResponse({ status: 200, type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation não encontrada' })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }

  @Post(':id/toggle')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inverter isActive (body vazio)' })
  @ApiResponse({ status: 200, type: AutomationResponseDto })
  @ApiResponse({ status: 404, description: 'Automation não encontrada' })
  toggle(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.toggle(workspaceId, id);
  }
}
