import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductionOrderStatus } from '@prisma/client';
import { ProductionOrdersRepository } from './production-orders.repository';
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

@Injectable()
export class ProductionOrdersService {
  private readonly logger = new Logger(ProductionOrdersService.name);

  constructor(
    private readonly productionOrdersRepository: ProductionOrdersRepository,
  ) {}

  // --- CRUD ---

  async create(dto: CreateProductionOrderDto): Promise<ProductionOrderResponseDto> {
    const order = await this.productionOrdersRepository.findOrderById(dto.orderId);
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    // Proteção contra código duplicado
    const existing = await this.productionOrdersRepository.findByCode(`OP-${order.orderNumber}`);
    if (existing) {
      throw new BadRequestException(
        `Ordem de produção OP-${order.orderNumber} já existe para este pedido`,
      );
    }

    const code = `OP-${order.orderNumber}`;

    const entity = await this.productionOrdersRepository.create({
      order: { connect: { id: dto.orderId } },
      code,
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.machineId !== undefined && { machineId: dto.machineId }),
      ...(dto.batch !== undefined && { batch: dto.batch }),
      ...(dto.scheduledDate !== undefined && { scheduledDate: dto.scheduledDate }),
      ...(dto.assignedUserId && {
        assignedUser: { connect: { id: dto.assignedUserId } },
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.items?.length && {
        items: {
          create: dto.items.map((item) => ({
            orderItem: { connect: { id: item.orderItemId } },
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            ...(item.pieces !== undefined && { pieces: item.pieces }),
            ...(item.size !== undefined && { size: item.size }),
            ...(item.unitMeasureId && {
              unitMeasure: { connect: { id: item.unitMeasureId } },
            }),
          })),
        },
      }),
    });

    this.logger.log(`Ordem de produção ${code} criada (ID: ${entity.id})`);
    return ProductionOrderResponseDto.fromEntity(entity);
  }

  async findAll(
    pagination: PaginationDto,
    search?: string,
    orderId?: string,
    status?: ProductionOrderStatus,
  ) {
    const { items, total } = await this.productionOrdersRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
      orderId,
      status,
    });

    return {
      items: items.map(ProductionOrderResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ProductionOrderResponseDto> {
    const entity = await this.productionOrdersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }
    return ProductionOrderResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateProductionOrderDto,
  ): Promise<ProductionOrderResponseDto> {
    const entity = await this.productionOrdersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }

    const updated = await this.productionOrdersRepository.update(id, {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.machineId !== undefined && { machineId: dto.machineId }),
      ...(dto.batch !== undefined && { batch: dto.batch }),
      ...(dto.scheduledDate !== undefined && { scheduledDate: dto.scheduledDate }),
      ...(dto.assignedUserId !== undefined && {
        assignedUser: dto.assignedUserId
          ? { connect: { id: dto.assignedUserId } }
          : { disconnect: true },
      }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    return ProductionOrderResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.productionOrdersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }
    await this.productionOrdersRepository.softDelete(id);
    this.logger.log(`Ordem de produção ${entity.code} removida`);
  }

  // --- Status Transitions ---

  async start(id: string): Promise<ProductionOrderResponseDto> {
    const entity = await this.productionOrdersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }
    if (entity.status !== ProductionOrderStatus.PENDING) {
      throw new BadRequestException(
        'Apenas ordens com status PENDING podem ser iniciadas',
      );
    }

    const updated = await this.productionOrdersRepository.update(id, {
      status: ProductionOrderStatus.IN_PROGRESS,
    });

    this.logger.log(`Ordem de produção ${entity.code} iniciada (IN_PROGRESS)`);
    return ProductionOrderResponseDto.fromEntity(updated);
  }

  async complete(id: string): Promise<ProductionOrderResponseDto> {
    const entity = await this.productionOrdersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }
    if (entity.status !== ProductionOrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Apenas ordens com status IN_PROGRESS podem ser concluídas',
      );
    }

    const updated = await this.productionOrdersRepository.update(id, {
      status: ProductionOrderStatus.COMPLETED,
      completedDate: new Date(),
    });

    this.logger.log(`Ordem de produção ${entity.code} concluída (COMPLETED)`);
    return ProductionOrderResponseDto.fromEntity(updated);
  }

  async cancel(id: string): Promise<ProductionOrderResponseDto> {
    const entity = await this.productionOrdersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }
    if (
      entity.status !== ProductionOrderStatus.PENDING &&
      entity.status !== ProductionOrderStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Apenas ordens com status PENDING ou IN_PROGRESS podem ser canceladas',
      );
    }

    const updated = await this.productionOrdersRepository.update(id, {
      status: ProductionOrderStatus.CANCELLED,
    });

    this.logger.log(`Ordem de produção ${entity.code} cancelada (CANCELLED)`);
    return ProductionOrderResponseDto.fromEntity(updated);
  }

  // --- Consumptions ---

  async addConsumption(
    productionOrderId: string,
    dto: CreateConsumptionDto,
  ): Promise<ProductionConsumptionResponseDto> {
    const order = await this.productionOrdersRepository.findById(productionOrderId);
    if (!order) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }

    const consumption = await this.productionOrdersRepository.addConsumption({
      productionOrder: { connect: { id: productionOrderId } },
      ingredient: { connect: { id: dto.ingredientId } },
      plannedQuantity: dto.plannedQuantity,
      ...(dto.actualQuantity !== undefined && { actualQuantity: dto.actualQuantity }),
      ...(dto.weightM3 !== undefined && { weightM3: dto.weightM3 }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.costCents !== undefined && { costCents: dto.costCents }),
      ...(dto.totalCostCents !== undefined && { totalCostCents: dto.totalCostCents }),
      ...(dto.unitMeasureId && {
        unitMeasure: { connect: { id: dto.unitMeasureId } },
      }),
    });

    return ProductionConsumptionResponseDto.fromEntity(consumption);
  }

  async updateConsumption(
    productionOrderId: string,
    consumptionId: string,
    dto: Partial<CreateConsumptionDto>,
  ): Promise<ProductionConsumptionResponseDto> {
    const existing = await this.productionOrdersRepository.findConsumptionById(consumptionId);
    if (!existing || existing.productionOrderId !== productionOrderId) {
      throw new NotFoundException('Consumo não encontrado nesta ordem de produção');
    }

    const updated = await this.productionOrdersRepository.updateConsumption(consumptionId, {
      ...(dto.plannedQuantity !== undefined && { plannedQuantity: dto.plannedQuantity }),
      ...(dto.actualQuantity !== undefined && { actualQuantity: dto.actualQuantity }),
      ...(dto.weightM3 !== undefined && { weightM3: dto.weightM3 }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.costCents !== undefined && { costCents: dto.costCents }),
      ...(dto.totalCostCents !== undefined && { totalCostCents: dto.totalCostCents }),
      ...(dto.ingredientId && {
        ingredient: { connect: { id: dto.ingredientId } },
      }),
      ...(dto.unitMeasureId !== undefined && {
        unitMeasure: dto.unitMeasureId
          ? { connect: { id: dto.unitMeasureId } }
          : { disconnect: true },
      }),
    });

    return ProductionConsumptionResponseDto.fromEntity(updated);
  }

  async removeConsumption(
    productionOrderId: string,
    consumptionId: string,
  ): Promise<void> {
    const existing = await this.productionOrdersRepository.findConsumptionById(consumptionId);
    if (!existing || existing.productionOrderId !== productionOrderId) {
      throw new NotFoundException('Consumo não encontrado nesta ordem de produção');
    }
    await this.productionOrdersRepository.removeConsumption(consumptionId);
  }

  // --- Outputs ---

  async addOutput(
    productionOrderId: string,
    dto: CreateOutputDto,
  ): Promise<ProductionOutputResponseDto> {
    const order = await this.productionOrdersRepository.findById(productionOrderId);
    if (!order) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }

    const output = await this.productionOrdersRepository.addOutput({
      productionOrder: { connect: { id: productionOrderId } },
      product: { connect: { id: dto.productId } },
      quantity: dto.quantity,
      ...(dto.unitMeasureId && {
        unitMeasure: { connect: { id: dto.unitMeasureId } },
      }),
    });

    return ProductionOutputResponseDto.fromEntity(output);
  }

  async updateOutput(
    productionOrderId: string,
    outputId: string,
    dto: Partial<CreateOutputDto>,
  ): Promise<ProductionOutputResponseDto> {
    const existing = await this.productionOrdersRepository.findOutputById(outputId);
    if (!existing || existing.productionOrderId !== productionOrderId) {
      throw new NotFoundException('Saída não encontrada nesta ordem de produção');
    }

    const updated = await this.productionOrdersRepository.updateOutput(outputId, {
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.productId && {
        product: { connect: { id: dto.productId } },
      }),
      ...(dto.unitMeasureId !== undefined && {
        unitMeasure: dto.unitMeasureId
          ? { connect: { id: dto.unitMeasureId } }
          : { disconnect: true },
      }),
    });

    return ProductionOutputResponseDto.fromEntity(updated);
  }

  async removeOutput(
    productionOrderId: string,
    outputId: string,
  ): Promise<void> {
    const existing = await this.productionOrdersRepository.findOutputById(outputId);
    if (!existing || existing.productionOrderId !== productionOrderId) {
      throw new NotFoundException('Saída não encontrada nesta ordem de produção');
    }
    await this.productionOrdersRepository.removeOutput(outputId);
  }

  // --- Losses ---

  async addLoss(
    productionOrderId: string,
    dto: CreateLossDto,
  ): Promise<ProductionLossResponseDto> {
    const order = await this.productionOrdersRepository.findById(productionOrderId);
    if (!order) {
      throw new NotFoundException('Ordem de produção não encontrada');
    }

    const loss = await this.productionOrdersRepository.addLoss({
      productionOrder: { connect: { id: productionOrderId } },
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.costCents !== undefined && { costCents: dto.costCents }),
    });

    return ProductionLossResponseDto.fromEntity(loss);
  }

  async updateLoss(
    productionOrderId: string,
    lossId: string,
    dto: Partial<CreateLossDto>,
  ): Promise<ProductionLossResponseDto> {
    const existing = await this.productionOrdersRepository.findLossById(lossId);
    if (!existing || existing.productionOrderId !== productionOrderId) {
      throw new NotFoundException('Perda não encontrada nesta ordem de produção');
    }

    const updated = await this.productionOrdersRepository.updateLoss(lossId, {
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.costCents !== undefined && { costCents: dto.costCents }),
    });

    return ProductionLossResponseDto.fromEntity(updated);
  }

  async removeLoss(
    productionOrderId: string,
    lossId: string,
  ): Promise<void> {
    const existing = await this.productionOrdersRepository.findLossById(lossId);
    if (!existing || existing.productionOrderId !== productionOrderId) {
      throw new NotFoundException('Perda não encontrada nesta ordem de produção');
    }
    await this.productionOrdersRepository.removeLoss(lossId);
  }
}
