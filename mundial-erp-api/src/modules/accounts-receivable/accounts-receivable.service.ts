import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus } from '@prisma/client';
import { AccountsReceivableRepository } from './accounts-receivable.repository';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/update-account-receivable.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { AccountReceivableResponseDto } from './dto/account-receivable-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class AccountsReceivableService {
  private readonly logger = new Logger(AccountsReceivableService.name);

  constructor(
    private readonly repository: AccountsReceivableRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateAccountReceivableDto,
  ): Promise<AccountReceivableResponseDto> {
    const entity = await this.repository.create({
      client: { connect: { id: dto.clientId } },
      description: dto.description,
      amountCents: dto.amountCents,
      paidAmountCents: 0,
      dueDate: new Date(dto.dueDate),
      status: PaymentStatus.PENDING,
      ...(dto.orderId && { order: { connect: { id: dto.orderId } } }),
      ...(dto.invoiceId && { invoice: { connect: { id: dto.invoiceId } } }),
    });

    this.eventEmitter.emit('account-receivable.created', {
      accountReceivableId: entity.id,
      clientId: entity.clientId,
    });

    this.logger.log(
      `Conta a receber criada (ID: ${entity.id}, Cliente: ${entity.clientId})`,
    );

    return AccountReceivableResponseDto.fromEntity(entity);
  }

  async findAll(
    pagination: PaginationDto,
    filters: { clientId?: string; status?: PaymentStatus; overdue?: boolean },
  ) {
    const { items, total } = await this.repository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map(AccountReceivableResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<AccountReceivableResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Conta a receber não encontrada');
    }
    return AccountReceivableResponseDto.fromEntity(entity);
  }

  async findByClientId(clientId: string, pagination: PaginationDto) {
    const { items, total } = await this.repository.findByClientId(clientId, {
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      items: items.map(AccountReceivableResponseDto.fromEntity),
      total,
    };
  }

  async update(
    id: string,
    dto: UpdateAccountReceivableDto,
  ): Promise<AccountReceivableResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    const updateData: Record<string, any> = {};

    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.amountCents !== undefined) updateData.amountCents = dto.amountCents;
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);

    if (dto.clientId !== undefined) {
      updateData.client = { connect: { id: dto.clientId } };
    }
    if (dto.orderId !== undefined) {
      updateData.order = dto.orderId
        ? { connect: { id: dto.orderId } }
        : { disconnect: true };
    }
    if (dto.invoiceId !== undefined) {
      updateData.invoice = dto.invoiceId
        ? { connect: { id: dto.invoiceId } }
        : { disconnect: true };
    }

    const updated = await this.repository.update(id, updateData);

    this.eventEmitter.emit('account-receivable.updated', {
      accountReceivableId: id,
    });

    return AccountReceivableResponseDto.fromEntity(updated);
  }

  async registerPayment(
    id: string,
    dto: RegisterPaymentDto,
  ): Promise<AccountReceivableResponseDto> {
    // Validate status before entering transaction
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    if (entity.status === PaymentStatus.PAID) {
      throw new BadRequestException('Conta a receber já está totalmente paga');
    }

    if (entity.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException(
        'Não é possível registrar pagamento em conta cancelada',
      );
    }

    // Atomic read-update inside transaction to prevent race conditions
    const paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
    const updated = await this.repository.registerPaymentAtomically(
      id,
      dto.amountCents,
      paidDate,
    );

    if (!updated) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    this.eventEmitter.emit('account-receivable.payment-registered', {
      accountReceivableId: id,
      amountCents: dto.amountCents,
      newPaidAmountCents: updated.paidAmountCents,
      status: updated.status,
    });

    this.logger.log(
      `Pagamento registrado na conta ${id}: +${dto.amountCents} centavos (total pago: ${updated.paidAmountCents}/${updated.amountCents}, status: ${updated.status})`,
    );

    return AccountReceivableResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Conta a receber não encontrada');
    }

    await this.repository.softDelete(id);

    this.eventEmitter.emit('account-receivable.deleted', {
      accountReceivableId: id,
    });
  }
}
