import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  StockRequisitionStatus,
  StockRequisitionType,
  Prisma,
} from '@prisma/client';
import { StockRequisitionsRepository } from './stock-requisitions.repository';
import { CreateStockRequisitionDto } from './dto/create-stock-requisition.dto';
import { ProcessItemDto } from './dto/process-item.dto';
import { StockRequisitionResponseDto } from './dto/stock-requisition-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class StockRequisitionsService {
  private readonly logger = new Logger(StockRequisitionsService.name);

  constructor(private readonly repository: StockRequisitionsRepository) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateStockRequisitionDto,
    userId: string,
  ): Promise<StockRequisitionResponseDto> {
    if (dto.type === StockRequisitionType.VENDA && !dto.orderId) {
      throw new BadRequestException(
        'orderId e obrigatorio para requisicoes do tipo VENDA',
      );
    }

    if (dto.orderId) {
      const order = await this.repository.findOrderById(dto.orderId);
      if (!order) {
        throw new BadRequestException(`Pedido "${dto.orderId}" nao encontrado`);
      }
    }

    // Validate CX items have unitsPerBox
    for (const item of dto.items) {
      if (item.unitType === 'CX' && !item.unitsPerBox) {
        throw new BadRequestException(
          `unitsPerBox e obrigatorio quando unitType = CX (produto: ${item.productId})`,
        );
      }
    }

    // Batch validate all products exist (single query instead of N+1)
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const foundProducts = await this.repository.findProductsByIds(productIds);
    const foundIds = new Set(foundProducts.map((p) => p.id));
    const missingIds = productIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Produtos nao encontrados: ${missingIds.join(', ')}`,
      );
    }

    const code = await this.repository.generateCode();

    const itemsData = dto.items.map((item) => {
      const quantityInBaseUnit =
        item.unitType === 'CX'
          ? item.requestedQuantity * (item.unitsPerBox ?? 1)
          : item.requestedQuantity;

      return {
        product: { connect: { id: item.productId } },
        requestedQuantity: item.requestedQuantity,
        unitType: item.unitType,
        unitsPerBox: item.unitsPerBox ?? null,
        quantityInBaseUnit,
      };
    });

    const createData: Prisma.StockRequisitionCreateInput = {
      code,
      type: dto.type,
      status: StockRequisitionStatus.PENDING,
      requestedBy: { connect: { id: userId } },
      ...(dto.orderId && { order: { connect: { id: dto.orderId } } }),
      notes: dto.notes,
      items: { create: itemsData },
    };

    const entity = await this.repository.create(createData);
    this.logger.log(`Requisicao ${code} criada (ID: ${entity.id})`);

    return StockRequisitionResponseDto.fromEntity(entity);
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  async findAll(
    pagination: PaginationDto,
    filters: {
      type?: StockRequisitionType;
      status?: StockRequisitionStatus;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const { items, total } = await this.repository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map(StockRequisitionResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<StockRequisitionResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }
    return StockRequisitionResponseDto.fromEntity(entity);
  }

  async findByCode(code: string): Promise<StockRequisitionResponseDto> {
    const entity = await this.repository.findByCode(code);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }
    return StockRequisitionResponseDto.fromEntity(entity);
  }

  // ---------------------------------------------------------------------------
  // APPROVE + PROCESS (scan único do código de barras da requisição)
  // ---------------------------------------------------------------------------

  async approve(
    id: string,
    userId: string,
  ): Promise<StockRequisitionResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }

    if (entity.status !== StockRequisitionStatus.PENDING) {
      throw new BadRequestException(
        `Requisicao so pode ser aprovada no status PENDING. Status atual: ${entity.status}`,
      );
    }

    const activeItems = entity.items
      .filter((i: { deletedAt: Date | null }) => !i.deletedAt)
      .map(
        (i: {
          id: string;
          productId: string;
          requestedQuantity: number;
          unitType: string;
          unitsPerBox: number | null;
          quantityInBaseUnit: number;
        }) => ({
          id: i.id,
          productId: i.productId,
          requestedQuantity: i.requestedQuantity,
          unitType: i.unitType,
          unitsPerBox: i.unitsPerBox,
          quantityInBaseUnit: i.quantityInBaseUnit,
        }),
      );

    if (activeItems.length === 0) {
      throw new BadRequestException(
        'Requisicao nao possui itens para processar',
      );
    }

    try {
      const updated = await this.repository.approveAndDeductStock(
        id,
        userId,
        activeItems,
      );
      this.logger.log(
        `Requisicao ${entity.code} aprovada e processada por ${userId} — ${activeItems.length} itens, estoque deduzido`,
      );
      return StockRequisitionResponseDto.fromEntity(updated);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_PENDING') {
        throw new BadRequestException(
          'Requisicao ja foi processada ou cancelada',
        );
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // PROCESS ITEM (scan EAN → seleciona UN/CX → baixa estoque)
  // ---------------------------------------------------------------------------

  async processItem(
    requisitionId: string,
    itemId: string,
    dto: ProcessItemDto,
  ): Promise<StockRequisitionResponseDto> {
    const entity = await this.repository.findById(requisitionId);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }

    if (entity.status !== StockRequisitionStatus.APPROVED) {
      throw new BadRequestException(
        `Requisicao precisa estar APPROVED para processar itens. Status atual: ${entity.status}`,
      );
    }

    const item = await this.repository.findItemById(itemId);
    if (!item || item.requisitionId !== requisitionId) {
      throw new NotFoundException('Item da requisicao nao encontrado');
    }

    if (item.actualQuantity != null) {
      throw new BadRequestException('Este item ja foi processado');
    }

    // Calculate base unit deduction
    const product = item.product;
    const unitsPerBox =
      dto.unitType === 'CX'
        ? (product?.unitsPerBox ?? item.unitsPerBox ?? 1)
        : 1;
    const quantityToDeduct = dto.actualQuantity * unitsPerBox;

    // Atomic transaction: re-check + update item + deduct stock (prevents race condition)
    try {
      await this.repository.processItemAndDeductStock(
        itemId,
        item.productId,
        {
          actualQuantity: dto.actualQuantity,
          unitType: dto.unitType,
          unitsPerBox: dto.unitType === 'CX' ? unitsPerBox : null,
        },
        quantityToDeduct,
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'ITEM_ALREADY_PROCESSED') {
        throw new BadRequestException('Este item ja foi processado');
      }
      throw err;
    }

    this.logger.log(
      `Item ${itemId} processado: ${dto.actualQuantity} ${dto.unitType} = ${quantityToDeduct} UN (estoque deduzido)`,
    );

    const updated = await this.repository.findById(requisitionId);
    return StockRequisitionResponseDto.fromEntity(updated!);
  }

  // ---------------------------------------------------------------------------
  // COMPLETE (todos itens processados → PROCESSED)
  // ---------------------------------------------------------------------------

  async complete(id: string): Promise<StockRequisitionResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }

    if (entity.status === StockRequisitionStatus.PROCESSED) {
      throw new BadRequestException('Requisicao ja foi processada');
    }

    if (entity.status === StockRequisitionStatus.CANCELLED) {
      throw new BadRequestException(
        'Requisicao cancelada nao pode ser finalizada',
      );
    }

    const activeItems = entity.items.filter(
      (i: { deletedAt: Date | null }) => !i.deletedAt,
    );
    const pendingItems = activeItems.filter(
      (i: { actualQuantity: number | null }) => i.actualQuantity == null,
    );

    if (pendingItems.length > 0) {
      const pendingNames = pendingItems
        .map(
          (i: { product?: { name: string }; productId: string }) =>
            i.product?.name ?? i.productId,
        )
        .join(', ');
      throw new BadRequestException(
        `Itens ainda nao processados: ${pendingNames}`,
      );
    }

    const updated = await this.repository.update(id, {
      status: StockRequisitionStatus.PROCESSED,
      processedAt: new Date(),
    });

    this.logger.log(`Requisicao ${entity.code} finalizada (PROCESSED)`);
    return StockRequisitionResponseDto.fromEntity(updated);
  }

  // ---------------------------------------------------------------------------
  // CANCEL (soft delete)
  // ---------------------------------------------------------------------------

  async cancel(id: string): Promise<void> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }

    if (entity.status === StockRequisitionStatus.PROCESSED) {
      throw new BadRequestException(
        'Requisicao ja processada nao pode ser cancelada',
      );
    }

    await this.repository.update(id, {
      status: StockRequisitionStatus.CANCELLED,
    });

    this.logger.log(`Requisicao ${entity.code} cancelada`);
  }

  // ---------------------------------------------------------------------------
  // REMOVE (hard delete)
  // ---------------------------------------------------------------------------

  async remove(id: string): Promise<void> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Requisicao nao encontrada');
    }

    if (entity.status === StockRequisitionStatus.PROCESSED) {
      throw new BadRequestException(
        'Requisicao ja processada nao pode ser excluida',
      );
    }

    await this.repository.hardDelete(id);

    this.logger.log(`Requisicao ${entity.code} excluida permanentemente`);
  }
}
