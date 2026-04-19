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
    workspaceId: string,
    dto: OpenCashRegisterDto,
    userId: string,
  ): Promise<CashRegisterResponseDto> {
    const entity = await this.cashRegistersRepository.openAtomically(
      workspaceId,
      dto.companyId,
      userId,
      dto.openingBalanceCents,
    );

    if (!entity) {
      throw new ConflictException(
        'Empresa não encontrada ou já existe um caixa aberto para esta empresa',
      );
    }

    this.eventEmitter.emit('cash-register.opened', {
      cashRegisterId: entity.id,
    });

    this.logger.log(
      `Caixa aberto (ID: ${entity.id}, Empresa: ${dto.companyId})`,
    );

    return CashRegisterResponseDto.fromEntity(entity);
  }

  async findAll(
    workspaceId: string,
    pagination: PaginationDto,
    filters: { companyId?: string; isOpen?: boolean },
  ) {
    const { items, total } = await this.cashRegistersRepository.findMany(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
        companyId: filters.companyId,
        isOpen: filters.isOpen,
      },
    );

    return {
      items: items.map(CashRegisterResponseDto.fromEntity),
      total,
    };
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<CashRegisterResponseDto> {
    const entity = await this.cashRegistersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Caixa não encontrado');
    }
    return CashRegisterResponseDto.fromEntity(entity);
  }

  async close(
    workspaceId: string,
    id: string,
    dto: CloseCashRegisterDto,
    userId: string,
  ): Promise<CashRegisterResponseDto> {
    const entity = await this.cashRegistersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Caixa não encontrado');
    }
    if (entity.closedAt) {
      throw new ConflictException('Caixa já está fechado');
    }

    const updated = await this.cashRegistersRepository.update(workspaceId, id, {
      closedAt: new Date(),
      closedBy: { connect: { id: userId } },
      closingBalanceCents: dto.closingBalanceCents,
    });

    this.eventEmitter.emit('cash-register.closed', {
      cashRegisterId: id,
    });

    return CashRegisterResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.cashRegistersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Caixa não encontrado');
    }
    await this.cashRegistersRepository.softDelete(workspaceId, id);
    this.eventEmitter.emit('cash-register.deleted', {
      cashRegisterId: id,
    });
  }
}
