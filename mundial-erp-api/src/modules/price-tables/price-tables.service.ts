import { Injectable, NotFoundException } from '@nestjs/common';
import { PriceTablesRepository } from './price-tables.repository';
import { CreatePriceTableDto } from './dto/create-price-table.dto';
import { UpdatePriceTableDto } from './dto/update-price-table.dto';
import { UpsertPriceTableItemDto } from './dto/upsert-price-table-item.dto';
import {
  PriceTableResponseDto,
  PriceTableItemResponseDto,
} from './dto/price-table-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class PriceTablesService {
  constructor(private readonly priceTablesRepository: PriceTablesRepository) {}

  async create(
    workspaceId: string,
    dto: CreatePriceTableDto,
  ): Promise<PriceTableResponseDto> {
    const entity = await this.priceTablesRepository.create(
      workspaceId,
      {
        name: dto.name,
        isDefault: dto.isDefault ?? false,
        ...(dto.proFinancasId !== undefined && {
          proFinancasId: dto.proFinancasId,
        }),
      },
      dto.isDefault === true,
    );
    return PriceTableResponseDto.fromEntity(entity);
  }

  async findAll(
    workspaceId: string,
    pagination: PaginationDto,
    search?: string,
  ) {
    const { items, total } = await this.priceTablesRepository.findMany(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
        search,
      },
    );
    return { items: items.map(PriceTableResponseDto.fromEntity), total };
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<PriceTableResponseDto> {
    const entity = await this.priceTablesRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    return PriceTableResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdatePriceTableDto,
  ): Promise<PriceTableResponseDto> {
    const entity = await this.priceTablesRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    const updated = await this.priceTablesRepository.update(
      workspaceId,
      id,
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.proFinancasId !== undefined && {
          proFinancasId: dto.proFinancasId,
        }),
      },
      dto.isDefault === true,
    );
    return PriceTableResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.priceTablesRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    await this.priceTablesRepository.softDelete(workspaceId, id);
  }

  // --- Items ---
  async upsertItem(
    workspaceId: string,
    tableId: string,
    dto: UpsertPriceTableItemDto,
  ): Promise<PriceTableItemResponseDto> {
    const table = await this.priceTablesRepository.findById(
      workspaceId,
      tableId,
    );
    if (!table) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    const item = await this.priceTablesRepository.upsertItem(
      workspaceId,
      tableId,
      dto.productId,
      dto.priceInCents,
    );
    return PriceTableItemResponseDto.fromEntity(item);
  }

  async findItems(
    workspaceId: string,
    tableId: string,
    pagination: PaginationDto,
  ) {
    const table = await this.priceTablesRepository.findById(
      workspaceId,
      tableId,
    );
    if (!table) {
      throw new NotFoundException('Tabela de preço não encontrada');
    }
    const { items, total } =
      await this.priceTablesRepository.findItemsByTableId(
        workspaceId,
        tableId,
        {
          skip: pagination.skip,
          take: pagination.limit,
        },
      );
    return { items: items.map(PriceTableItemResponseDto.fromEntity), total };
  }

  async removeItem(
    workspaceId: string,
    tableId: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.priceTablesRepository.findItemById(
      workspaceId,
      itemId,
    );
    if (!item || item.priceTableId !== tableId) {
      throw new NotFoundException('Item não encontrado nesta tabela de preço');
    }
    await this.priceTablesRepository.removeItem(workspaceId, itemId);
  }
}
