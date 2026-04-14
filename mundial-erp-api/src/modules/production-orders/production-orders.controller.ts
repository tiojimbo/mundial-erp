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
import { ProductionOrderStatus, Role } from '@prisma/client';
import * as express from 'express';
import { ProductionOrdersService } from './production-orders.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { CreateConsumptionDto } from './dto/create-consumption.dto';
import { CreateOutputDto } from './dto/create-output.dto';
import { CreateLossDto } from './dto/create-loss.dto';
import {
  ProductionOrderResponseDto,
  ProductionConsumptionResponseDto,
  ProductionOutputResponseDto,
  ProductionLossResponseDto,
} from './dto/production-order-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import { ProductionOrderPdfService } from '../orders/pdf/production-order-pdf.service';

@ApiTags('Production Orders')
@ApiBearerAuth()
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly productionOrderPdfService: ProductionOrderPdfService,
  ) {}

  // --- CRUD ---

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar ordem de produção' })
  @ApiResponse({ status: 201, type: ProductionOrderResponseDto })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionOrdersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar ordens de produção' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProductionOrderStatus })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: ProductionOrderStatus,
  ) {
    return this.productionOrdersService.findAll(pagination, search, orderId, status);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar ordem de produção por ID' })
  @ApiResponse({ status: 200, type: ProductionOrderResponseDto })
  @ApiResponse({ status: 404, description: 'Ordem de produção não encontrada' })
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar ordem de produção' })
  @ApiResponse({ status: 200, type: ProductionOrderResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionOrdersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ordem de produção (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.productionOrdersService.remove(id);
  }

  // --- Status Transitions ---

  @Patch(':id/start')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Iniciar produção (PENDING → IN_PROGRESS)' })
  @ApiResponse({ status: 200, type: ProductionOrderResponseDto })
  start(@Param('id') id: string) {
    return this.productionOrdersService.start(id);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Concluir produção (IN_PROGRESS → COMPLETED)' })
  @ApiResponse({ status: 200, type: ProductionOrderResponseDto })
  complete(@Param('id') id: string) {
    return this.productionOrdersService.complete(id);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cancelar ordem de produção (PENDING/IN_PROGRESS → CANCELLED)' })
  @ApiResponse({ status: 200, type: ProductionOrderResponseDto })
  cancel(@Param('id') id: string) {
    return this.productionOrdersService.cancel(id);
  }

  // --- PDF ---

  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Gerar PDF Ficha da Ordem de Produção (PLANO 4.2d)' })
  @ApiResponse({ status: 200, description: 'PDF binário' })
  async getPdf(@Param('id') id: string, @Res() res: express.Response) {
    const buffer = await this.productionOrderPdfService.generate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ficha-op-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // --- Consumptions ---

  @Post(':id/consumptions')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar consumo à ordem de produção' })
  @ApiResponse({ status: 201, type: ProductionConsumptionResponseDto })
  addConsumption(
    @Param('id') id: string,
    @Body() dto: CreateConsumptionDto,
  ) {
    return this.productionOrdersService.addConsumption(id, dto);
  }

  @Patch(':id/consumptions/:consumptionId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar consumo da ordem de produção' })
  @ApiResponse({ status: 200, type: ProductionConsumptionResponseDto })
  updateConsumption(
    @Param('id') id: string,
    @Param('consumptionId') consumptionId: string,
    @Body() dto: Partial<CreateConsumptionDto>,
  ) {
    return this.productionOrdersService.updateConsumption(id, consumptionId, dto);
  }

  @Delete(':id/consumptions/:consumptionId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover consumo da ordem de produção' })
  @ApiResponse({ status: 204 })
  removeConsumption(
    @Param('id') id: string,
    @Param('consumptionId') consumptionId: string,
  ) {
    return this.productionOrdersService.removeConsumption(id, consumptionId);
  }

  // --- Outputs ---

  @Post(':id/outputs')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar saída/produção à ordem' })
  @ApiResponse({ status: 201, type: ProductionOutputResponseDto })
  addOutput(
    @Param('id') id: string,
    @Body() dto: CreateOutputDto,
  ) {
    return this.productionOrdersService.addOutput(id, dto);
  }

  @Patch(':id/outputs/:outputId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar saída/produção da ordem' })
  @ApiResponse({ status: 200, type: ProductionOutputResponseDto })
  updateOutput(
    @Param('id') id: string,
    @Param('outputId') outputId: string,
    @Body() dto: Partial<CreateOutputDto>,
  ) {
    return this.productionOrdersService.updateOutput(id, outputId, dto);
  }

  @Delete(':id/outputs/:outputId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover saída/produção da ordem' })
  @ApiResponse({ status: 204 })
  removeOutput(
    @Param('id') id: string,
    @Param('outputId') outputId: string,
  ) {
    return this.productionOrdersService.removeOutput(id, outputId);
  }

  // --- Losses ---

  @Post(':id/losses')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Registrar perda na ordem de produção' })
  @ApiResponse({ status: 201, type: ProductionLossResponseDto })
  addLoss(
    @Param('id') id: string,
    @Body() dto: CreateLossDto,
  ) {
    return this.productionOrdersService.addLoss(id, dto);
  }

  @Patch(':id/losses/:lossId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar perda da ordem de produção' })
  @ApiResponse({ status: 200, type: ProductionLossResponseDto })
  updateLoss(
    @Param('id') id: string,
    @Param('lossId') lossId: string,
    @Body() dto: Partial<CreateLossDto>,
  ) {
    return this.productionOrdersService.updateLoss(id, lossId, dto);
  }

  @Delete(':id/losses/:lossId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover perda da ordem de produção' })
  @ApiResponse({ status: 204 })
  removeLoss(
    @Param('id') id: string,
    @Param('lossId') lossId: string,
  ) {
    return this.productionOrdersService.removeLoss(id, lossId);
  }
}
