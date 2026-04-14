import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import { PurchaseQuotationsRepository } from '../purchase-quotations/purchase-quotations.repository';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

/**
 * Status Machine — PurchaseOrder:
 *   PENDING → CONFIRMED → RECEIVED
 *   PENDING → CANCELLED
 *   CONFIRMED → CANCELLED
 *
 * Regra crítica: Sem cotação SELECTED, não é possível criar PurchaseOrder.
 * Ao criar PurchaseOrder, AP (AccountPayable) é gerado automaticamente.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RECEIVED', 'CANCELLED'],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly ordersRepository: PurchaseOrdersRepository,
    private readonly quotationsRepository: PurchaseQuotationsRepository,
  ) {}

  /**
   * Efetivar compra — cria PurchaseOrder + AccountPayable automaticamente.
   * Guard: quotation must be SELECTED.
   * Handoff: Compras → Financeiro (AP criado com status PENDING).
   */
  async create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrderResponseDto> {
    // Guard: quotation must exist and be SELECTED
    const quotation = await this.quotationsRepository.findById(dto.quotationId);
    if (!quotation) {
      throw new NotFoundException('Cotação não encontrada');
    }
    if (quotation.status !== 'SELECTED') {
      throw new BadRequestException(
        'Apenas cotações com status SELECTED podem gerar pedido de compra',
      );
    }

    // Build item descriptions for AP (PLANO 3.3 handoff: "descrição dos itens")
    const itemDescriptions = quotation.items
      ?.map((item) => `${item.quantity}x produto ${item.productId}`)
      .join(', ');

    try {
      const entity = await this.ordersRepository.createWithAccountPayable({
        supplierId: quotation.supplierId,
        quotationId: quotation.id,
        totalCents: quotation.totalCents,
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : undefined,
        notes: dto.notes,
        itemDescriptions,
      });

      return PurchaseOrderResponseDto.fromEntity(entity);
    } catch (error) {
      if (error instanceof Error && error.message === 'QUOTATION_ALREADY_CONSUMED') {
        throw new ConflictException(
          'Esta cotação já foi utilizada para gerar um pedido de compra',
        );
      }
      throw error;
    }
  }

  async findAll(
    pagination: PaginationDto,
    filters?: { status?: string; supplierId?: string; search?: string },
  ) {
    const { items, total } = await this.ordersRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      status: filters?.status,
      supplierId: filters?.supplierId,
      search: filters?.search,
    });

    return {
      items: items.map(PurchaseOrderResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<PurchaseOrderResponseDto> {
    const entity = await this.ordersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Pedido de compra não encontrado');
    }
    return PurchaseOrderResponseDto.fromEntity(entity);
  }

  async updateStatus(
    id: string,
    newStatus: string,
  ): Promise<PurchaseOrderResponseDto> {
    const entity = await this.ordersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Pedido de compra não encontrado');
    }

    this.validateTransition(entity.status, newStatus);

    const updated = await this.ordersRepository.update(id, {
      status: newStatus,
    });

    return PurchaseOrderResponseDto.fromEntity(updated);
  }

  private validateTransition(currentStatus: string, newStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição inválida: ${currentStatus} → ${newStatus}`,
      );
    }
  }
}
