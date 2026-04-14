import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { SuppliersRepository } from './suppliers.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PurchaseHistoryResponseDto } from './dto/purchase-history-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly suppliersRepository: SuppliersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    const existing = await this.suppliersRepository.findByCpfCnpj(dto.cpfCnpj);
    if (existing) {
      throw new ConflictException('Fornecedor com este CPF/CNPJ já existe');
    }

    const entity = await this.suppliersRepository.create({
      personType: dto.personType,
      cpfCnpj: dto.cpfCnpj,
      name: dto.name,
      tradeName: dto.tradeName,
      ie: dto.ie,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      isActive: dto.isActive ?? true,
      proFinancasId: dto.proFinancasId,
    });

    this.eventEmitter.emit('supplier.created', { supplierId: entity.id });
    return SupplierResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.suppliersRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return {
      items: items.map(SupplierResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<SupplierResponseDto> {
    const entity = await this.suppliersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    return SupplierResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    const entity = await this.suppliersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (dto.cpfCnpj) {
      const existing = await this.suppliersRepository.findByCpfCnpj(dto.cpfCnpj);
      if (existing && existing.id !== id) {
        throw new ConflictException('Fornecedor com este CPF/CNPJ já existe');
      }
    }

    const updateData: Prisma.SupplierUpdateInput = {};
    if (dto.personType !== undefined) updateData.personType = dto.personType;
    if (dto.cpfCnpj !== undefined) updateData.cpfCnpj = dto.cpfCnpj;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.tradeName !== undefined) updateData.tradeName = dto.tradeName;
    if (dto.ie !== undefined) updateData.ie = dto.ie;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.zipCode !== undefined) updateData.zipCode = dto.zipCode;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.proFinancasId !== undefined) updateData.proFinancasId = dto.proFinancasId;

    const updated = await this.suppliersRepository.update(id, updateData);
    this.eventEmitter.emit('supplier.updated', { supplierId: id });
    return SupplierResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.suppliersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    await this.suppliersRepository.softDelete(id);
    this.eventEmitter.emit('supplier.deleted', { supplierId: id });
  }

  async findPurchaseHistory(id: string, pagination: PaginationDto) {
    const entity = await this.suppliersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    const { items, total } = await this.suppliersRepository.findPurchaseHistory(id, {
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      items: items.map(PurchaseHistoryResponseDto.fromEntity),
      total,
    };
  }
}
