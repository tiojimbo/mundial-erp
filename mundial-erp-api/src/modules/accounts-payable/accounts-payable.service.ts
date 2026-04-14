import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus } from '@prisma/client';
import { AccountsPayableRepository } from './accounts-payable.repository';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/update-account-payable.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { AccountPayableResponseDto } from './dto/account-payable-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class AccountsPayableService {
  private readonly logger = new Logger(AccountsPayableService.name);

  constructor(
    private readonly repository: AccountsPayableRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAccountPayableDto): Promise<AccountPayableResponseDto> {
    const entity = await this.repository.create({
      amountCents: dto.amountCents,
      paidAmountCents: 0,
      dueDate: new Date(dto.dueDate),
      status: PaymentStatus.PENDING,
      ...(dto.supplierId && { supplier: { connect: { id: dto.supplierId } } }),
      ...(dto.purchaseOrderId && { purchaseOrder: { connect: { id: dto.purchaseOrderId } } }),
      ...(dto.description && { description: dto.description }),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
    });

    this.eventEmitter.emit('account-payable.created', {
      accountPayableId: entity.id,
    });

    this.logger.log(`Conta a pagar criada (ID: ${entity.id})`);

    return AccountPayableResponseDto.fromEntity(entity);
  }

  async findAll(
    pagination: PaginationDto,
    filters: {
      supplierId?: string;
      status?: PaymentStatus;
      categoryId?: string;
      overdue?: boolean;
    },
  ) {
    const { items, total } = await this.repository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      supplierId: filters.supplierId,
      status: filters.status,
      categoryId: filters.categoryId,
      overdue: filters.overdue,
    });

    return {
      items: items.map(AccountPayableResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<AccountPayableResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }
    return AccountPayableResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateAccountPayableDto): Promise<AccountPayableResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    const updateData: Record<string, any> = {};

    if (dto.amountCents !== undefined) updateData.amountCents = dto.amountCents;
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);
    if (dto.description !== undefined) updateData.description = dto.description;

    if (dto.supplierId !== undefined) {
      updateData.supplier = dto.supplierId
        ? { connect: { id: dto.supplierId } }
        : { disconnect: true };
    }
    if (dto.purchaseOrderId !== undefined) {
      updateData.purchaseOrder = dto.purchaseOrderId
        ? { connect: { id: dto.purchaseOrderId } }
        : { disconnect: true };
    }
    if (dto.categoryId !== undefined) {
      updateData.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };
    }

    const updated = await this.repository.update(id, updateData);

    this.eventEmitter.emit('account-payable.updated', {
      accountPayableId: id,
    });

    this.logger.log(`Conta a pagar atualizada (ID: ${id})`);

    return AccountPayableResponseDto.fromEntity(updated);
  }

  async registerPayment(id: string, dto: RegisterPaymentDto): Promise<AccountPayableResponseDto> {
    // Validate status before entering transaction
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    if (existing.status === PaymentStatus.PAID) {
      throw new BadRequestException('Conta a pagar já está totalmente paga');
    }

    if (existing.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException('Não é possível registrar pagamento em conta cancelada');
    }

    // Atomic read-update inside transaction to prevent race conditions
    const paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
    const updated = await this.repository.registerPaymentAtomically(
      id,
      dto.amountCents,
      paidDate,
    );

    if (!updated) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    this.eventEmitter.emit('account-payable.payment-registered', {
      accountPayableId: id,
      amountCents: dto.amountCents,
      totalPaidCents: updated.paidAmountCents,
      status: updated.status,
    });

    this.logger.log(
      `Pagamento registrado na conta ${id}: ${dto.amountCents} centavos (total pago: ${updated.paidAmountCents}/${updated.amountCents})`,
    );

    return AccountPayableResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Conta a pagar não encontrada');
    }

    await this.repository.softDelete(id);

    this.eventEmitter.emit('account-payable.deleted', {
      accountPayableId: id,
    });

    this.logger.log(`Conta a pagar removida (ID: ${id})`);
  }
}
