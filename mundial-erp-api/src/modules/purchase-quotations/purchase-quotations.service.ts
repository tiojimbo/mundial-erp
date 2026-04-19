import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PurchaseQuotationsRepository } from './purchase-quotations.repository';
import { CreatePurchaseQuotationDto } from './dto/create-purchase-quotation.dto';
import { UpdatePurchaseQuotationDto } from './dto/update-purchase-quotation.dto';
import { PurchaseQuotationResponseDto } from './dto/purchase-quotation-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

/**
 * Status Machine — PurchaseQuotation:
 *   DRAFT → SENT → RECEIVED → SELECTED | REJECTED
 *   SELECTED → ORDERED (set atomically when PurchaseOrder is created)
 *
 * Transições válidas:
 *   DRAFT    → SENT
 *   SENT     → RECEIVED
 *   RECEIVED → SELECTED
 *   RECEIVED → REJECTED
 *   SELECTED → ORDERED (via PurchaseOrder creation only)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT'],
  SENT: ['RECEIVED'],
  RECEIVED: ['SELECTED', 'REJECTED'],
};

@Injectable()
export class PurchaseQuotationsService {
  constructor(
    private readonly quotationsRepository: PurchaseQuotationsRepository,
  ) {}

  async create(
    dto: CreatePurchaseQuotationDto,
  ): Promise<PurchaseQuotationResponseDto> {
    // Validate supplier exists
    const supplier = await this.quotationsRepository.findSupplierById(
      dto.supplierId,
    );
    if (!supplier) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    // Auto-calculate totalCents from items if provided
    const totalCents =
      dto.items?.reduce(
        (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
        0,
      ) ?? 0;

    const entity = await this.quotationsRepository.create(
      {
        supplier: { connect: { id: dto.supplierId } },
        status: 'DRAFT',
        totalCents,
        notes: dto.notes,
      },
      dto.items,
    );

    return PurchaseQuotationResponseDto.fromEntity(entity);
  }

  async findAll(
    pagination: PaginationDto,
    filters?: { status?: string; supplierId?: string; search?: string },
  ) {
    const { items, total } = await this.quotationsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      status: filters?.status,
      supplierId: filters?.supplierId,
      search: filters?.search,
    });

    return {
      items: items.map(PurchaseQuotationResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<PurchaseQuotationResponseDto> {
    const entity = await this.quotationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cotação não encontrada');
    }
    return PurchaseQuotationResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdatePurchaseQuotationDto,
  ): Promise<PurchaseQuotationResponseDto> {
    const entity = await this.quotationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cotação não encontrada');
    }

    // Validate status transition if status is being changed
    if (dto.status) {
      this.validateTransition(entity.status, dto.status);
    }

    const updateData: Prisma.PurchaseQuotationUpdateInput = {};
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.receivedAt !== undefined)
      updateData.receivedAt = new Date(dto.receivedAt);
    if (dto.totalCents !== undefined) updateData.totalCents = dto.totalCents;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // If transitioning to SENT, record requestedAt
    if (dto.status === 'SENT' && !entity.requestedAt) {
      updateData.requestedAt = new Date();
    }

    // If transitioning to RECEIVED, record receivedAt
    if (dto.status === 'RECEIVED' && !dto.receivedAt) {
      updateData.receivedAt = new Date();
    }

    // Auto-calculate totalCents from items if items are provided
    if (dto.items) {
      updateData.totalCents = dto.items.reduce(
        (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
        0,
      );
    }

    // Atomic: update fields + replace items in a single transaction
    const updated = await this.quotationsRepository.updateWithItems(
      id,
      updateData,
      dto.items,
    );

    return PurchaseQuotationResponseDto.fromEntity(updated);
  }

  async select(id: string): Promise<PurchaseQuotationResponseDto> {
    const entity = await this.quotationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cotação não encontrada');
    }

    this.validateTransition(entity.status, 'SELECTED');

    const updated = await this.quotationsRepository.update(id, {
      status: 'SELECTED',
    });

    return PurchaseQuotationResponseDto.fromEntity(updated);
  }

  async reject(id: string): Promise<PurchaseQuotationResponseDto> {
    const entity = await this.quotationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cotação não encontrada');
    }

    this.validateTransition(entity.status, 'REJECTED');

    const updated = await this.quotationsRepository.update(id, {
      status: 'REJECTED',
    });

    return PurchaseQuotationResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.quotationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cotação não encontrada');
    }

    if (entity.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas cotações em DRAFT podem ser removidas',
      );
    }

    await this.quotationsRepository.softDelete(id);
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
