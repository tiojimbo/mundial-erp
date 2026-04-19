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
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import * as express from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { CreateOrderItemSupplyDto } from './dto/create-order-item-supply.dto';
import { ToggleSupplyDto } from './dto/toggle-supply.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderTimelineEntryDto } from './dto/order-timeline-response.dto';
import { OrderItemSupplyResponseDto } from './dto/order-item-supply-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { ProposalPdfService } from './pdf/proposal-pdf.service';
import { LabelPdfService } from './pdf/label-pdf.service';
import { ProductionOrderPdfService } from './pdf/production-order-pdf.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly proposalPdfService: ProposalPdfService,
    private readonly labelPdfService: LabelPdfService,
    private readonly productionOrderPdfService: ProductionOrderPdfService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar pedido (inicia como EM_ORCAMENTO)' })
  @ApiResponse({ status: 201, type: OrderResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.create(workspaceId, dto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar pedidos (filtro status/cliente/usuario)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por numero, titulo ou cliente',
  })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'createdByUserId', required: false })
  @ApiResponse({ status: 200, type: OrderResponseDto, isArray: true })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
    @Query('clientId') clientId?: string,
    @Query('createdByUserId') createdByUserId?: string,
  ) {
    return this.ordersService.findAll(workspaceId, pagination, {
      search,
      status,
      clientId,
      createdByUserId,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Dossie completo do pedido (items, supplies, historico)',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Pedido nao encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.ordersService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Atualizar dados do pedido (items, pagamento, etc)',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Pedido nao esta em EM_ORCAMENTO' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover pedido (soft delete, somente EM_ORCAMENTO)',
  })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.ordersService.remove(workspaceId, id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Avancar status do pedido (dispara BPM engine + guards)',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Transicao invalida ou guard falhou',
  })
  changeStatus(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.changeStatus(workspaceId, id, dto, userId);
  }

  @Get(':id/timeline')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Timeline completa do processo' })
  @ApiResponse({ status: 200, type: OrderTimelineEntryDto, isArray: true })
  getTimeline(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.ordersService.getTimeline(workspaceId, id);
  }

  @Patch(':id/payment')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Registrar pagamento (paidAmountCents + paymentProofUrl)',
  })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  registerPayment(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.ordersService.registerPayment(workspaceId, id, dto);
  }

  @Post(':id/items/:itemId/supplies')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar supply (insumo/acabamento) a um item' })
  @ApiResponse({ status: 201, type: OrderItemSupplyResponseDto })
  addSupply(
    @WorkspaceId() workspaceId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateOrderItemSupplyDto,
  ) {
    return this.ordersService.addSupply(workspaceId, orderId, itemId, dto);
  }

  @Patch(':id/items/:itemId/supplies/:supplyId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Marcar supply como READY/PENDING (toggle checklist)',
  })
  @ApiResponse({ status: 200, type: OrderItemSupplyResponseDto })
  toggleSupply(
    @WorkspaceId() workspaceId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Param('supplyId') supplyId: string,
    @Body() dto: ToggleSupplyDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ordersService.toggleSupply(
      workspaceId,
      orderId,
      itemId,
      supplyId,
      dto,
      userId,
    );
  }

  // ---------------------------------------------------------------------------
  // PDF ENDPOINTS
  // ---------------------------------------------------------------------------

  @Get(':id/pdf/proposal')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Gerar PDF "Proposta de Venda"' })
  @ApiResponse({ status: 200, description: 'PDF binario' })
  async getPdfProposal(@Param('id') id: string, @Res() res: express.Response) {
    const buffer = await this.proposalPdfService.generate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="proposta-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/pdf/production-label')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Gerar Etiqueta de Producao (itens FABRICACAO_PROPRIA)',
  })
  @ApiResponse({ status: 200, description: 'PDF binario' })
  async getPdfProductionLabel(
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const buffer = await this.labelPdfService.generateProductionLabel(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="etiqueta-producao-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/pdf/separation-label')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Gerar Etiqueta de Separacao (itens REVENDA/INSUMO)',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF binario (404 se nao houver itens REVENDA)',
  })
  async getPdfSeparationLabel(
    @Param('id') id: string,
    @Res() res: express.Response,
  ) {
    const buffer = await this.labelPdfService.generateSeparationLabel(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="etiqueta-separacao-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
