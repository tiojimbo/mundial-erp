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
import { WorkspaceMemberRole } from '@prisma/client';
import { OrderFlowsService } from './order-flows.service';
import { CreateOrderFlowDto } from './dto/create-order-flow.dto';
import { UpdateOrderFlowDto } from './dto/update-order-flow.dto';
import { OrderFlowResponseDto } from './dto/order-flow-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../auth/decorators';

@ApiTags('Order Flows')
@ApiBearerAuth()
@Controller('order-flows')
export class OrderFlowsController {
  constructor(private readonly orderFlowsService: OrderFlowsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar fluxo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 201, type: OrderFlowResponseDto })
  create(@Body() dto: CreateOrderFlowDto) {
    return this.orderFlowsService.create(dto);
  }

  @Get()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Listar fluxos de pedido' })
  findAll(@Query() pagination: PaginationDto) {
    return this.orderFlowsService.findAll(pagination);
  }

  @Get(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Buscar fluxo de pedido por ID' })
  @ApiResponse({ status: 200, type: OrderFlowResponseDto })
  @ApiResponse({ status: 404, description: 'Fluxo de pedido não encontrado' })
  findOne(@Param('id') id: string) {
    return this.orderFlowsService.findById(id);
  }

  @Patch(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar fluxo de pedido (somente ADMIN)' })
  @ApiResponse({ status: 200, type: OrderFlowResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateOrderFlowDto) {
    return this.orderFlowsService.update(id, dto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover fluxo de pedido (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.orderFlowsService.remove(id);
  }
}
