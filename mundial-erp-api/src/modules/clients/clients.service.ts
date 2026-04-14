import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientsRepository } from './clients.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { ClientOrderResponseDto } from './dto/client-order-response.dto';
import { ClientFinancialResponseDto } from './dto/client-financial-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { PersonType } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateClientDto): Promise<ClientResponseDto> {
    this.validateCpfCnpj(dto.cpfCnpj, dto.personType);

    const existing = await this.clientsRepository.findByCpfCnpj(dto.cpfCnpj);
    if (existing) {
      throw new ConflictException('Cliente com este CPF/CNPJ já existe');
    }

    const entity = await this.clientsRepository.create({
      personType: dto.personType,
      cpfCnpj: dto.cpfCnpj,
      name: dto.name,
      tradeName: dto.tradeName,
      ie: dto.ie,
      rg: dto.rg,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      addressNumber: dto.addressNumber,
      neighborhood: dto.neighborhood,
      complement: dto.complement,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      ...(dto.classificationId && {
        classification: { connect: { id: dto.classificationId } },
      }),
      ...(dto.deliveryRouteId && {
        deliveryRoute: { connect: { id: dto.deliveryRouteId } },
      }),
      ...(dto.defaultPriceTableId && {
        defaultPriceTable: { connect: { id: dto.defaultPriceTableId } },
      }),
      ...(dto.defaultPaymentMethodId && {
        defaultPaymentMethod: { connect: { id: dto.defaultPaymentMethodId } },
      }),
      proFinancasId: dto.proFinancasId,
    });

    this.eventEmitter.emit('client.created', { clientId: entity.id });
    return ClientResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.clientsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return {
      items: items.map(ClientResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ClientResponseDto> {
    const entity = await this.clientsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return ClientResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientResponseDto> {
    const entity = await this.clientsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (dto.cpfCnpj) {
      const personType = dto.personType ?? entity.personType;
      this.validateCpfCnpj(dto.cpfCnpj, personType);

      const existing = await this.clientsRepository.findByCpfCnpj(dto.cpfCnpj);
      if (existing && existing.id !== id) {
        throw new ConflictException('Cliente com este CPF/CNPJ já existe');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.personType !== undefined) updateData.personType = dto.personType;
    if (dto.cpfCnpj !== undefined) updateData.cpfCnpj = dto.cpfCnpj;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.tradeName !== undefined) updateData.tradeName = dto.tradeName;
    if (dto.ie !== undefined) updateData.ie = dto.ie;
    if (dto.rg !== undefined) updateData.rg = dto.rg;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.addressNumber !== undefined) updateData.addressNumber = dto.addressNumber;
    if (dto.neighborhood !== undefined) updateData.neighborhood = dto.neighborhood;
    if (dto.complement !== undefined) updateData.complement = dto.complement;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.zipCode !== undefined) updateData.zipCode = dto.zipCode;
    if (dto.proFinancasId !== undefined) updateData.proFinancasId = dto.proFinancasId;

    if (dto.classificationId !== undefined) {
      updateData.classification = dto.classificationId
        ? { connect: { id: dto.classificationId } }
        : { disconnect: true };
    }
    if (dto.deliveryRouteId !== undefined) {
      updateData.deliveryRoute = dto.deliveryRouteId
        ? { connect: { id: dto.deliveryRouteId } }
        : { disconnect: true };
    }
    if (dto.defaultPriceTableId !== undefined) {
      updateData.defaultPriceTable = dto.defaultPriceTableId
        ? { connect: { id: dto.defaultPriceTableId } }
        : { disconnect: true };
    }
    if (dto.defaultPaymentMethodId !== undefined) {
      updateData.defaultPaymentMethod = dto.defaultPaymentMethodId
        ? { connect: { id: dto.defaultPaymentMethodId } }
        : { disconnect: true };
    }

    const updated = await this.clientsRepository.update(id, updateData);
    this.eventEmitter.emit('client.updated', { clientId: id });
    return ClientResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.clientsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cliente não encontrado');
    }
    await this.clientsRepository.softDelete(id);
    this.eventEmitter.emit('client.deleted', { clientId: id });
  }

  async findOrders(id: string, pagination: PaginationDto) {
    const clientExists = await this.clientsRepository.exists(id);
    if (!clientExists) {
      throw new NotFoundException('Cliente não encontrado');
    }
    const { items, total } = await this.clientsRepository.findOrdersByClientId(id, {
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(ClientOrderResponseDto.fromEntity),
      total,
    };
  }

  async getFinancials(id: string): Promise<ClientFinancialResponseDto> {
    const clientExists = await this.clientsRepository.exists(id);
    if (!clientExists) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return this.clientsRepository.getFinancialSummary(id);
  }

  private validateCpfCnpj(cpfCnpj: string, personType: PersonType): void {
    const digits = cpfCnpj.replace(/\D/g, '');

    if (personType === PersonType.F) {
      if (!this.isValidCpf(digits)) {
        throw new BadRequestException('CPF inválido');
      }
    } else {
      if (!this.isValidCnpj(digits)) {
        throw new BadRequestException('CNPJ inválido');
      }
    }
  }

  private isValidCpf(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  private isValidCnpj(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;

    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(cnpj.charAt(13))) return false;

    return true;
  }
}
