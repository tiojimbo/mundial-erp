import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BrandsRepository } from './brands.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  async create(dto: CreateBrandDto): Promise<BrandResponseDto> {
    const existing = await this.brandsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Marca já cadastrada');
    }
    const entity = await this.brandsRepository.create({
      name: dto.name,
      ...(dto.proFinancasId !== undefined && { proFinancasId: dto.proFinancasId }),
    });
    return BrandResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.brandsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return { items: items.map(BrandResponseDto.fromEntity), total };
  }

  async findById(id: string): Promise<BrandResponseDto> {
    const entity = await this.brandsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Marca não encontrada');
    }
    return BrandResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandResponseDto> {
    const entity = await this.brandsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Marca não encontrada');
    }
    if (dto.name && dto.name !== entity.name) {
      const existing = await this.brandsRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Marca já cadastrada');
      }
    }
    const updated = await this.brandsRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.proFinancasId !== undefined && { proFinancasId: dto.proFinancasId }),
    });
    return BrandResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.brandsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Marca não encontrada');
    }
    await this.brandsRepository.softDelete(id);
  }
}
