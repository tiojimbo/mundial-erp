import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceTablesRepository } from './price-tables.repository';
import { CreatePriceTableDto } from './dto/create-price-table.dto';
import { UpdatePriceTableDto } from './dto/update-price-table.dto';
import { UpsertPriceTableItemDto } from './dto/upsert-price-table-item.dto';
import { PriceTableResponseDto, PriceTableItemResponseDto } from './dto/price-table-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class PriceTablesService {
  constructor(private readonly priceTablesRepository: PriceTablesRepository) {}

  async create(dto: CreatePriceTableDto): Promise<PriceTableResponseDto> {
    const entity = await this.priceTablesRepository.create(
      {
        name: dto.name,
        isDefault: dto.isDefault ?? false,
        ...(dto.proFinancasId !== undefined && { proFinancasId: dto.proFinancasId }),
      },
      dto.isDefault === true,
    );
    return PriceTableResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.priceTablesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return { items: items.map(PriceTableResponseDto.fromEntity), total };
  }

  async findById(id: string): Promise<PriceTableResponseDto> {
    const entity = await this.priceTablesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    return PriceTableResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdatePriceTableDto): Promise<PriceTableResponseDto> {
    const entity = await this.priceTablesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    const updated = await this.priceTablesRepository.update(
      id,
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.proFinancasId !== undefined && { proFinancasId: dto.proFinancasId }),
      },
      dto.isDefault === true,
    );
    return PriceTableResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.priceTablesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    await this.priceTablesRepository.softDelete(id);
  }

  // --- Items ---
  async upsertItem(tableId: string, dto: UpsertPriceTableItemDto): Promise<PriceTableItemResponseDto> {
    const table = await this.priceTablesRepository.findById(tableId);
    if (!table) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    const item = await this.priceTablesRepository.upsertItem(tableId, dto.productId, dto.priceInCents);
    return PriceTableItemResponseDto.fromEntity(item);
  }

  async findItems(tableId: string, pagination: PaginationDto) {
    const table = await this.priceTablesRepository.findById(tableId);
    if (!table) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    const { items, total } = await this.priceTablesRepository.findItemsByTableId(tableId, {
      skip: pagination.skip,
      take: pagination.limit,
    });
    return { items: items.map(PriceTableItemResponseDto.fromEntity), total };
  }

  async removeItem(tableId: string, itemId: string): Promise<void> {
    const item = await this.priceTablesRepository.findItemById(itemId);
    if (!item || item.priceTableId !== tableId) {
      throw new NotFoundException('Item não encontrado nesta tabela de preço');
    }
    await this.priceTablesRepository.removeItem(itemId);
  }
}
