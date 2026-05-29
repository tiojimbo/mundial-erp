import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceMemberRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CustomFieldValuesService } from './custom-field-values.service';
import { CustomFieldValueResponseDto } from './dtos/custom-field-value-response.dto';
import { SetCustomFieldValueDto } from './dtos/set-custom-field-value.dto';
import { SetCustomFieldValuesBulkDto } from './dtos/set-custom-field-values-bulk.dto';
import { CurrentUser, WorkspaceRoles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Task Custom Fields')
@ApiBearerAuth()
@Controller()
export class CustomFieldValuesController {
  constructor(private readonly service: CustomFieldValuesService) {}

  @Get('tasks/:taskId/custom-fields')
  @ApiOperation({
    summary: 'Listar valores de custom fields da tarefa (com definitions)',
  })
  @ApiResponse({
    status: 200,
    type: CustomFieldValueResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Tarefa nao encontrada' })
  list(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
  ): Promise<CustomFieldValueResponseDto[]> {
    return this.service.listForTask(workspaceId, taskId);
  }

  @Put('tasks/:taskId/custom-fields/:definitionId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Definir valor de custom field (idempotente em 5s) — path ERP legado',
  })
  @ApiResponse({ status: 200, type: CustomFieldValueResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Definition marcada como readOnly nao aceita escrita',
  })
  @ApiResponse({
    status: 404,
    description: 'Tarefa ou definition nao encontrada',
  })
  @ApiResponse({ status: 422, description: 'Valor invalido para o tipo' })
  setValueLegacy(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('definitionId') definitionId: string,
    @Body() dto: SetCustomFieldValueDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CustomFieldValueResponseDto> {
    return this.service.setValue(
      workspaceId,
      taskId,
      definitionId,
      dto.value,
      user.sub,
    );
  }

  @Put('custom-fields/task/:taskId/field/:definitionId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Definir valor de custom field (idempotente em 5s) — path Hoppe',
  })
  @ApiResponse({ status: 200, type: CustomFieldValueResponseDto })
  setValueHoppe(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('definitionId') definitionId: string,
    @Body() dto: SetCustomFieldValueDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CustomFieldValueResponseDto> {
    return this.service.setValue(
      workspaceId,
      taskId,
      definitionId,
      dto.value,
      user.sub,
    );
  }

  @Put('custom-fields/task/:taskId/fields')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Definir valores de varios custom fields da tarefa (bulk)',
  })
  @ApiResponse({
    status: 200,
    description: 'Valores processados — { updated, failed }',
  })
  setValuesBulk(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: SetCustomFieldValuesBulkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.setValuesBulk(
      workspaceId,
      taskId,
      dto.values,
      user.sub,
    );
  }

  @Delete('custom-fields/task/:taskId/field/:definitionId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Limpar valor de um custom field na tarefa' })
  @ApiResponse({
    status: 200,
    schema: { example: { message: 'Field value deleted successfully' } },
  })
  @ApiResponse({
    status: 404,
    description: 'Tarefa, definition ou valor nao encontrado',
  })
  async clearValue(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('definitionId') definitionId: string,
  ): Promise<{ message: string }> {
    await this.service.clearValue(workspaceId, taskId, definitionId);
    return { message: 'Field value deleted successfully' };
  }
}
