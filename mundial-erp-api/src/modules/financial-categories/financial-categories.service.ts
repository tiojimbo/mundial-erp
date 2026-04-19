import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialCategoriesRepository } from './financial-categories.repository';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';
import { FinancialCategoryResponseDto } from './dto/financial-category-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class FinancialCategoriesService {
  private readonly logger = new Logger(FinancialCategoriesService.name);

  constructor(
    private readonly financialCategoriesRepository: FinancialCategoriesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateFinancialCategoryDto,
  ): Promise<FinancialCategoryResponseDto> {
    const entity = await this.financialCategoriesRepository.create(
      workspaceId,
      {
        name: dto.name,
        type: dto.type,
        ...(dto.parentId && {
          parent: { connect: { id: dto.parentId } },
        }),
      },
    );
    this.eventEmitter.emit('financial-category.created', {
      categoryId: entity.id,
    });
    return FinancialCategoryResponseDto.fromEntity(entity);
  }

  async findAll(
    workspaceId: string,
    pagination: PaginationDto,
    search?: string,
    type?: string,
  ) {
    const { items, total } = await this.financialCategoriesRepository.findMany(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
        search,
        type,
      },
    );
    return {
      items: items.map(FinancialCategoryResponseDto.fromEntity),
      total,
    };
  }

  async findRoots(workspaceId: string, pagination: PaginationDto) {
    const { items, total } = await this.financialCategoriesRepository.findRoots(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
      },
    );
    return {
      items: items.map(FinancialCategoryResponseDto.fromEntity),
      total,
    };
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<FinancialCategoryResponseDto> {
    const entity = await this.financialCategoriesRepository.findById(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Categoria financeira não encontrada');
    }
    return FinancialCategoryResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateFinancialCategoryDto,
  ): Promise<FinancialCategoryResponseDto> {
    const entity = await this.financialCategoriesRepository.findById(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Categoria financeira não encontrada');
    }
    const updated = await this.financialCategoriesRepository.update(
      workspaceId,
      id,
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.parentId !== undefined && {
          parent: dto.parentId
            ? { connect: { id: dto.parentId } }
            : { disconnect: true },
        }),
      },
    );
    this.eventEmitter.emit('financial-category.updated', { categoryId: id });
    return FinancialCategoryResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.financialCategoriesRepository.findById(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Categoria financeira não encontrada');
    }
    await this.financialCategoriesRepository.softDelete(workspaceId, id);
    this.eventEmitter.emit('financial-category.deleted', { categoryId: id });
  }
}
