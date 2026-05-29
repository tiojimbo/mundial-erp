import {
  Body,
  Controller,
  Delete,
  Get,
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
import { WorkspaceMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CustomFieldDefinitionsService } from './custom-field-definitions.service';
import { CreateCustomFieldDefinitionDto } from './dtos/create-custom-field-definition.dto';
import { UpdateCustomFieldDefinitionDto } from './dtos/update-custom-field-definition.dto';
import { CustomFieldDefinitionResponseDto } from './dtos/custom-field-definition-response.dto';
import { GroupedCustomFieldsResponseDto } from './dtos/grouped-custom-fields-response.dto';
import { ListCustomFieldsQueryDto } from './dtos/list-custom-fields-query.dto';
import { ManagerCustomFieldsQueryDto } from './dtos/manager-custom-fields-query.dto';
import { ManagerCustomFieldItemDto } from './dtos/manager-custom-fields-response.dto';
import {
  AddCustomFieldLocationDto,
  RemoveCustomFieldLocationQueryDto,
} from './dtos/custom-field-location.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@Controller('custom-fields')
export class CustomFieldDefinitionsController {
  constructor(private readonly service: CustomFieldDefinitionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar custom fields agrupados por escopo (filtros opcionais)',
  })
  @ApiResponse({ status: 200, type: GroupedCustomFieldsResponseDto })
  list(
    @WorkspaceId() workspaceId: string,
    @Query() query: ListCustomFieldsQueryDto,
  ) {
    return this.service.list(workspaceId, query);
  }

  @Get('manager')
  @ApiOperation({
    summary:
      'Vista de gerenciamento: custom fields enriquecidos com usageCount, locations, taskTypes',
  })
  @ApiResponse({
    status: 200,
    type: ManagerCustomFieldItemDto,
    isArray: true,
  })
  manager(
    @WorkspaceId() workspaceId: string,
    @Query() query: ManagerCustomFieldsQueryDto,
  ) {
    return this.service.manager(workspaceId, query.scope, {
      spaceId: query.spaceId,
      folderId: query.folderId,
      listId: query.listId,
      taskTypeId: query.taskTypeId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar custom field definition por ID' })
  @ApiResponse({ status: 200, type: CustomFieldDefinitionResponseDto })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.findOne(workspaceId, id);
  }

  @Post('location')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Vincular/mover campo existente a um local (list/folder/space)',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  addLocation(
    @WorkspaceId() workspaceId: string,
    @Body() dto: AddCustomFieldLocationDto,
  ) {
    return this.service.addLocation(workspaceId, dto);
  }

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar custom field definition para o workspace' })
  @ApiResponse({ status: 201, type: CustomFieldDefinitionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Já existe um campo personalizado com esse nome neste nível',
  })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomFieldDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(workspaceId, dto, user.sub);
  }

  @Put(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Atualizar custom field definition' })
  @ApiResponse({ status: 200, type: CustomFieldDefinitionResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Builtin custom field definitions are read-only',
  })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefinitionDto,
  ) {
    return this.service.update(workspaceId, id, dto);
  }

  @Delete(':customFieldId/location')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Desvincular campo de um local (list/folder/space)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  removeLocation(
    @WorkspaceId() workspaceId: string,
    @Param('customFieldId') customFieldId: string,
    @Query() query: RemoveCustomFieldLocationQueryDto,
  ) {
    return this.service.removeLocation(
      workspaceId,
      customFieldId,
      query.locationType,
      query.locationId,
    );
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Soft-delete e retorna o objeto deletado' })
  @ApiResponse({ status: 200, type: CustomFieldDefinitionResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Builtin custom field definitions are read-only',
  })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }
}
