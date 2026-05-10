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
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CustomFieldDefinitionsService } from './custom-field-definitions.service';
import { CreateCustomFieldDefinitionDto } from './dtos/create-custom-field-definition.dto';
import { UpdateCustomFieldDefinitionDto } from './dtos/update-custom-field-definition.dto';
import { CustomFieldDefinitionResponseDto } from './dtos/custom-field-definition-response.dto';
import { GroupedCustomFieldsResponseDto } from './dtos/grouped-custom-fields-response.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@Controller('custom-fields')
export class CustomFieldDefinitionsController {
  constructor(private readonly service: CustomFieldDefinitionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar custom fields agrupados por escopo',
  })
  @ApiResponse({ status: 200, type: GroupedCustomFieldsResponseDto })
  list(@WorkspaceId() workspaceId: string) {
    return this.service.list(workspaceId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar custom field definition por ID' })
  @ApiResponse({ status: 200, type: CustomFieldDefinitionResponseDto })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.findOne(workspaceId, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar custom field definition para o workspace' })
  @ApiResponse({ status: 201, type: CustomFieldDefinitionResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Ja existe definition com a mesma key neste workspace',
  })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomFieldDefinitionDto,
  ) {
    return this.service.create(workspaceId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
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

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Soft-delete de custom field definition' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 403,
    description: 'Builtin custom field definitions are read-only',
  })
  @ApiResponse({ status: 404, description: 'Definition nao encontrada' })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }
}
