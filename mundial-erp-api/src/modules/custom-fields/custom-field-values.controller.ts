import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CustomFieldValuesService } from './custom-field-values.service';
import { CustomFieldValueResponseDto } from './dtos/custom-field-value-response.dto';
import { SetCustomFieldValueDto } from './dtos/set-custom-field-value.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import type { JwtPayload } from '../../common/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

/**
 * Endpoints aninhados em `/tasks/:taskId/custom-fields[/:definitionId]`.
 *
 * Lock semantico: `taskId` aqui referencia `WorkItem.id`. A facade `Tasks` ja
 * usa esse modelo subjacente (ADR-001).
 */
@ApiTags('Task Custom Fields')
@ApiBearerAuth()
@Controller('tasks/:taskId/custom-fields')
export class CustomFieldValuesController {
  constructor(private readonly service: CustomFieldValuesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
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

  @Patch(':definitionId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Definir/atualizar valor de um custom field na tarefa (idempotente em janela 5s)',
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
  setValue(
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
}
