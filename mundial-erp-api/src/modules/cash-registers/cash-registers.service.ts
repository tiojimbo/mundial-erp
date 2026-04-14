import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CashRegistersRepository } from './cash-registers.repository';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CashRegisterResponseDto } from './dto/cash-register-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class CashRegistersService {
  private readonly logger = new Logger(CashRegistersService.name);

  constructor(
    private readonly cashRegistersRepository: CashRegistersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async open(
    dto: OpenCashRegisterDto,
    userId: string,
  ): Promise<CashRegisterResponseDto> {
    // Atomic check-then-create inside transaction to prevent race conditions
    const entity = await this.cashRegistersRepository.openAtomically(
      dto.companyId,
      userId,
      dto.openingBalanceCents,
    );

    if (!entity) {
      throw new ConflictException(
        'Já existe um caixa aberto para esta empresa',
      );
    }

    this.eventEmitter.emit('cash-register.opened', {
      cashRegisterId: entity.id,
    });

    this.logger.log(`Caixa aberto (ID: ${entity.id}, Empresa: ${dto.companyId})`);

    return CashRegisterResponseDto.fromEntity(entity);
  }

  async findAll(
    pagination: PaginationDto,
    filters: { companyId?: string; isOpen?: boolean },
  ) {
    const { items, total } = await this.cashRegistersRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      companyId: filters.companyId,
      isOpen: filters.isOpen,
    });

    return {
      items: items.map(CashRegisterResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<CashRegisterResponseDto> {
    const entity = await this.cashRegistersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Caixa não encontrado');
    }
    return CashRegisterResponseDto.fromEntity(entity);
  }

  async close(
    id: string,
    dto: CloseCashRegisterDto,
    userId: string,
  ): Promise<CashRegisterResponseDto> {
    const entity = await this.cashRegistersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Caixa não encontrado');
    }
    if (entity.closedAt) {
      throw new ConflictException('Caixa já está fechado');
    }

    const updated = await this.cashRegistersRepository.update(id, {
      closedAt: new Date(),
      closedBy: { connect: { id: userId } },
      closingBalanceCents: dto.closingBalanceCents,
    });

    this.eventEmitter.emit('cash-register.closed', {
      cashRegisterId: id,
    });

    return CashRegisterResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.cashRegistersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Caixa não encontrado');
    }
    await this.cashRegistersRepository.softDelete(id);
    this.eventEmitter.emit('cash-register.deleted', {
      cashRegisterId: id,
    });
  }
}
