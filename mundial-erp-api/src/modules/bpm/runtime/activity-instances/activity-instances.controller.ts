import {
  Body,
  Controller,
  Get,
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
import { ActivityStatus, Role } from '@prisma/client';
import { ActivityInstancesService } from './activity-instances.service';
import { CreateActivityInstanceDto } from './dto/create-activity-instance.dto';
import { AssignActivityInstanceDto } from './dto/assign-activity-instance.dto';
import { ActivityInstanceResponseDto } from './dto/activity-instance-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Activity Instances')
@ApiBearerAuth()
@Controller('activity-instances')
export class ActivityInstancesController {
  constructor(
    private readonly activityInstancesService: ActivityInstancesService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar instâncias de atividade' })
  @ApiQuery({ name: 'processInstanceId', required: false })
  @ApiQuery({ name: 'assignedUserId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ActivityStatus })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('processInstanceId') processInstanceId?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('status') status?: ActivityStatus,
  ) {
    return this.activityInstancesService.findAll(pagination, {
      processInstanceId,
      assignedUserId,
      status,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar instância de atividade por ID' })
  @ApiResponse({ status: 200, type: ActivityInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de atividade não encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.activityInstancesService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar instância de atividade' })
  @ApiResponse({ status: 201, type: ActivityInstanceResponseDto })
  create(@Body() dto: CreateActivityInstanceDto) {
    return this.activityInstancesService.create(dto);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atribuir usuário a instância de atividade' })
  @ApiResponse({ status: 200, type: ActivityInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de atividade não encontrada',
  })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignActivityInstanceDto,
  ) {
    return this.activityInstancesService.assign(id, dto.userId);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Completar instância de atividade' })
  @ApiResponse({ status: 200, type: ActivityInstanceResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Tarefas obrigatórias pendentes',
  })
  @ApiResponse({
    status: 404,
    description: 'Instância de atividade não encontrada',
  })
  complete(@Param('id') id: string) {
    return this.activityInstancesService.complete(id);
  }
}
