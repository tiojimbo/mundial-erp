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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { WorkflowStatusesService } from './workflow-statuses.service';
import { CreateWorkflowStatusDto } from './dto/create-workflow-status.dto';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto';
import { WorkflowStatusResponseDto } from './dto/workflow-status-response.dto';
import { ReorderWorkflowStatusesDto } from './dto/reorder-workflow-statuses.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Workflow Statuses')
@ApiBearerAuth()
@Controller('workflow-statuses')
export class WorkflowStatusesController {
  constructor(
    private readonly workflowStatusesService: WorkflowStatusesService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar status de workflow (ADMIN, MANAGER)' })
  @ApiResponse({ status: 201, type: WorkflowStatusResponseDto })
  create(@Body() dto: CreateWorkflowStatusDto) {
    return this.workflowStatusesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar statuses por departamento (ou área), agrupados por categoria',
  })
  @ApiQuery({ name: 'departmentId', required: true, type: String })
  @ApiQuery({ name: 'areaId', required: false, type: String })
  findByDepartment(
    @Query('departmentId') departmentId: string,
    @Query('areaId') areaId?: string,
  ) {
    return this.workflowStatusesService.findByDepartment(departmentId, areaId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Atualizar nome/cor/ícone do status (ADMIN, MANAGER)',
  })
  @ApiResponse({ status: 200, type: WorkflowStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Status não encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowStatusDto) {
    return this.workflowStatusesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover status (soft delete, ADMIN, MANAGER)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description:
      'Status possui work items — informe migrateToStatusId no body',
  })
  @ApiResponse({
    status: 409,
    description: 'Não é possível remover o último status de uma categoria',
  })
  remove(
    @Param('id') id: string,
    @Body() body: { migrateToStatusId?: string },
  ) {
    return this.workflowStatusesService.remove(id, body?.migrateToStatusId);
  }

  @Post('reorder')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reordenar statuses em massa (ADMIN, MANAGER)' })
  @ApiResponse({ status: 204 })
  reorder(@Body() dto: ReorderWorkflowStatusesDto) {
    return this.workflowStatusesService.reorder(dto);
  }
}
