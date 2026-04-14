import {
  Body,
  Controller,
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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly ordersService: PurchaseOrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Efetivar compra (cria AP automaticamente)' })
  @ApiResponse({ status: 201, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Cotação não está com status SELECTED' })
  @ApiResponse({ status: 404, description: 'Cotação não encontrada' })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED'] })
  @ApiQuery({ name: 'supplierId', required: false, description: 'Filtrar por fornecedor' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por notas ou nome do fornecedor' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.findAll(pagination, { status, supplierId, search });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Detalhe do pedido de compra' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 404, description: 'Pedido de compra não encontrado' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/confirm')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Confirmar pedido de compra (fornecedor confirmou)' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  confirm(@Param('id') id: string) {
    return this.ordersService.updateStatus(id, 'CONFIRMED');
  }

  @Patch(':id/receive')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Registrar recebimento do material' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  receive(@Param('id') id: string) {
    return this.ordersService.updateStatus(id, 'RECEIVED');
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cancelar pedido de compra' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  cancel(@Param('id') id: string) {
    return this.ordersService.updateStatus(id, 'CANCELLED');
  }
}
