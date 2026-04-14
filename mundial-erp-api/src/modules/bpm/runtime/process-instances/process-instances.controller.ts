import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProcessStatus, Role } from '@prisma/client';
import { ProcessInstancesService } from './process-instances.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ProcessInstanceResponseDto } from './dto/process-instance-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Process Instances')
@ApiBearerAuth()
@Controller('process-instances')
export class ProcessInstancesController {
  constructor(
    private readonly processInstancesService: ProcessInstancesService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar instâncias de processo' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'processId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProcessStatus })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('orderId') orderId?: string,
    @Query('processId') processId?: string,
    @Query('status') status?: ProcessStatus,
  ) {
    return this.processInstancesService.findAll(pagination, {
      orderId,
      processId,
      status,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar instância de processo por ID' })
  @ApiResponse({ status: 200, type: ProcessInstanceResponseDto })
  @ApiResponse({ status: 404, description: 'Instância de processo não encontrada' })
  findOne(@Param('id') id: string) {
    return this.processInstancesService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar instância de processo' })
  @ApiResponse({ status: 201, type: ProcessInstanceResponseDto })
  create(@Body() dto: CreateProcessInstanceDto) {
    return this.processInstancesService.create(dto);
  }

  @Patch(':id/start')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Iniciar instância de processo' })
  @ApiResponse({ status: 200, type: ProcessInstanceResponseDto })
  @ApiResponse({ status: 404, description: 'Instância de processo não encontrada' })
  start(@Param('id') id: string) {
    return this.processInstancesService.start(id);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Completar instância de processo' })
  @ApiResponse({ status: 200, type: ProcessInstanceResponseDto })
  @ApiResponse({ status: 404, description: 'Instância de processo não encontrada' })
  complete(@Param('id') id: string) {
    return this.processInstancesService.complete(id);
  }
}
