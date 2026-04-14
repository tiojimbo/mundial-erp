import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HandoffStatus, Role } from '@prisma/client';
import { HandoffInstancesService } from './handoff-instances.service';
import { RejectHandoffInstanceDto } from './dto/reject-handoff-instance.dto';
import { HandoffInstanceResponseDto } from './dto/handoff-instance-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Handoff Instances')
@ApiBearerAuth()
@Controller('handoff-instances')
export class HandoffInstancesController {
  constructor(
    private readonly handoffInstancesService: HandoffInstancesService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar instâncias de handoff' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: HandoffStatus })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('orderId') orderId?: string,
    @Query('status') status?: HandoffStatus,
  ) {
    return this.handoffInstancesService.findAll(pagination, {
      orderId,
      status,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar instância de handoff por ID' })
  @ApiResponse({ status: 200, type: HandoffInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de handoff não encontrada',
  })
  findOne(@Param('id') id: string) {
    return this.handoffInstancesService.findById(id);
  }

  @Patch(':id/accept')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Aceitar handoff e criar processo destino' })
  @ApiResponse({ status: 200, type: HandoffInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de handoff não encontrada',
  })
  accept(@Param('id') id: string) {
    return this.handoffInstancesService.accept(id);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rejeitar handoff' })
  @ApiResponse({ status: 200, type: HandoffInstanceResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Instância de handoff não encontrada',
  })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectHandoffInstanceDto,
  ) {
    return this.handoffInstancesService.reject(id, dto.reason);
  }
}
