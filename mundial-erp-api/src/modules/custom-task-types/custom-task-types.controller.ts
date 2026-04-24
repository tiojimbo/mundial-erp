import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CustomTaskTypesService } from './custom-task-types.service';
import { CustomTaskTypeFiltersDto } from './dtos/custom-task-type-filters.dto';
import { CustomTaskTypeResponseDto } from './dtos/custom-task-type-response.dto';
import { CreateCustomTaskTypeDto } from './dtos/create-custom-task-type.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Controller de `CustomTaskType` (PLANO-TASKS.md §7.3).
 *
 * Read-only: `GET /custom-task-types` e `GET /custom-task-types/:id`.
 * Viewer+ — qualquer membro do workspace pode listar builtins e tipos privados.
 * Cross-tenant (tipo privado de outro workspace) retorna 404 (§8.1).
 *
 * Guards Jwt+Workspace+Roles sao globais (`app.module.ts`).
 */
@ApiTags('Custom Task Types')
@ApiBearerAuth()
@Controller('custom-task-types')
export class CustomTaskTypesController {
  constructor(private readonly service: CustomTaskTypesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar custom task types (builtins + privados do workspace)',
  })
  @ApiResponse({ status: 200, type: [CustomTaskTypeResponseDto] })
  list(
    @WorkspaceId() workspaceId: string,
    @Query() filters: CustomTaskTypeFiltersDto,
  ) {
    return this.service.list(workspaceId, filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Detalhe de custom task type' })
  @ApiResponse({ status: 200, type: CustomTaskTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Custom task type nao encontrado' })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    const data = await this.service.findById(id, workspaceId);
    return { data, meta: { id } };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar custom task type (workspace privado)' })
  @ApiResponse({ status: 201, type: CustomTaskTypeResponseDto })
  @ApiResponse({ status: 409, description: 'Nome ja existe no workspace' })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCustomTaskTypeDto,
  ) {
    return this.service.create(workspaceId, dto);
  }
}
