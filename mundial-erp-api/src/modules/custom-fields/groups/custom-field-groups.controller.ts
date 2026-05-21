import {
  Body,
  Controller,
  Delete,
  Get,
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
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CustomFieldGroupsService } from './custom-field-groups.service';
import { CreateCustomFieldGroupDto } from './dtos/create-custom-field-group.dto';
import { UpdateCustomFieldGroupDto } from './dtos/update-custom-field-group.dto';
import { CustomFieldGroupResponseDto } from './dtos/custom-field-group-response.dto';
import { Roles } from '../../auth/decorators';
import { WorkspaceId } from '../../workspaces/decorators/workspace-id.decorator';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@Controller('custom-fields/groups')
export class CustomFieldGroupsController {
  constructor(private readonly service: CustomFieldGroupsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Lista groups do workspace' })
  @ApiResponse({
    status: 200,
    type: CustomFieldGroupResponseDto,
    isArray: true,
  })
  list(@WorkspaceId() workspaceId: string) {
    return this.service.list(workspaceId);
  }

  @Get('task-type/:taskTypeId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Groups usados por defs ligadas a um taskType',
  })
  @ApiResponse({
    status: 200,
    type: CustomFieldGroupResponseDto,
    isArray: true,
  })
  listByTaskType(
    @WorkspaceId() workspaceId: string,
    @Param('taskTypeId') taskTypeId: string,
  ) {
    return this.service.listByTaskType(workspaceId, taskTypeId);
  }

  @Get('list/:listId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Groups usados por defs ligadas a uma lista',
  })
  @ApiResponse({
    status: 200,
    type: CustomFieldGroupResponseDto,
    isArray: true,
  })
  listByList(
    @WorkspaceId() workspaceId: string,
    @Param('listId') listId: string,
  ) {
    return this.service.listByList(workspaceId, listId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Busca group por ID' })
  @ApiResponse({ status: 200, type: CustomFieldGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group nao encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.findOne(workspaceId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cria group' })
  @ApiResponse({ status: 201, type: CustomFieldGroupResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomFieldGroupDto,
  ) {
    return this.service.create(workspaceId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Atualiza group' })
  @ApiResponse({ status: 200, type: CustomFieldGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group nao encontrado' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldGroupDto,
  ) {
    return this.service.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Deleta group; defs ligadas tem groupId zerado via ON DELETE SET NULL',
  })
  @ApiResponse({ status: 200, type: CustomFieldGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group nao encontrado' })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }
}
