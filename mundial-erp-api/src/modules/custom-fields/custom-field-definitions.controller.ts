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
import { QueryCustomFieldDefinitionsDto } from './dtos/query-custom-field-definitions.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * CRUD de `CustomFieldDefinition`.
 *
 * Guards globais (JwtAuth + Workspace + Roles + Throttler) sao aplicados em
 * `app.module.ts` via APP_GUARD; este controller declara apenas `@Roles` e
 * `@Throttle` quando os defaults precisam de ajuste.
 *
 * Cross-tenant -> 404 (nunca 403). Builtins -> 403 em mutacoes com mensagem
 * estavel "Builtin custom field definitions are read-only".
 */
@ApiTags('Custom Field Definitions')
@ApiBearerAuth()
@Controller('custom-field-definitions')
export class CustomFieldDefinitionsController {
  constructor(private readonly service: CustomFieldDefinitionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary:
      'Listar custom field definitions visiveis (workspace atual + builtins globais)',
  })
  @ApiResponse({
    status: 200,
    type: CustomFieldDefinitionResponseDto,
    isArray: true,
  })
  list(
    @WorkspaceId() workspaceId: string,
    @Query() query: QueryCustomFieldDefinitionsDto,
  ) {
    return this.service.list(workspaceId, query);
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

  @Patch(':id')
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
