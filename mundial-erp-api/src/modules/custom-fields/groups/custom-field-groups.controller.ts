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
import { WorkspaceMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CustomFieldGroupsService } from './custom-field-groups.service';
import { CreateCustomFieldGroupDto } from './dtos/create-custom-field-group.dto';
import { UpdateCustomFieldGroupDto } from './dtos/update-custom-field-group.dto';
import { CustomFieldGroupResponseDto } from './dtos/custom-field-group-response.dto';
import { WorkspaceRoles } from '../../auth/decorators';
import { WorkspaceId } from '../../workspaces/decorators/workspace-id.decorator';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@Controller('custom-fields/groups')
export class CustomFieldGroupsController {
  constructor(private readonly service: CustomFieldGroupsService) {}

  @Get()
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
  @ApiOperation({ summary: 'Busca group por ID' })
  @ApiResponse({ status: 200, type: CustomFieldGroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group nao encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.findOne(workspaceId, id);
  }

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
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
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
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
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
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
