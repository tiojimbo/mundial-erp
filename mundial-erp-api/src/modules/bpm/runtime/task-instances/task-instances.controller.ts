import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TaskInstancesService } from './task-instances.service';
import { TaskInstanceResponseDto } from './dto/task-instance-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { CurrentUser, Roles } from '../../../auth/decorators';
import type { JwtPayload } from '../../../auth/decorators';

@ApiTags('BPM - Task Instances')
@ApiBearerAuth()
@Controller('task-instances')
export class TaskInstancesController {
  constructor(
    private readonly taskInstancesService: TaskInstancesService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar instâncias de tarefa' })
  @ApiQuery({ name: 'activityInstanceId', required: false })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('activityInstanceId') activityInstanceId?: string,
  ) {
    return this.taskInstancesService.findAll(pagination, {
      activityInstanceId,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar instância de tarefa por ID' })
  @ApiResponse({ status: 200, type: TaskInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de tarefa não encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.taskInstancesService.findById(id);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Alternar status da tarefa (PENDING ↔ DONE)',
  })
  @ApiResponse({ status: 200, type: TaskInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de tarefa não encontrada',
  })
  toggle(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.taskInstancesService.toggle(id, user.sub);
  }
}
