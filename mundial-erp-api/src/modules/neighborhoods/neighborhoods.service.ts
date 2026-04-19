import { Injectable, NotFoundException } from '@nestjs/common';
import { NeighborhoodsRepository } from './neighborhoods.repository';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
import { NeighborhoodResponseDto } from './dto/neighborhood-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class NeighborhoodsService {
  constructor(
    private readonly neighborhoodsRepository: NeighborhoodsRepository,
  ) {}

  async create(dto: CreateNeighborhoodDto): Promise<NeighborhoodResponseDto> {
    const entity = await this.neighborhoodsRepository.create({
      name: dto.name,
      city: { connect: { id: dto.cityId } },
      proFinancasId: dto.proFinancasId,
    });

    return NeighborhoodResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.neighborhoodsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(NeighborhoodResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<NeighborhoodResponseDto> {
    const entity = await this.neighborhoodsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Bairro não encontrado');
    }
    return NeighborhoodResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateNeighborhoodDto,
  ): Promise<NeighborhoodResponseDto> {
    const entity = await this.neighborhoodsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Bairro não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.cityId !== undefined)
      updateData.city = { connect: { id: dto.cityId } };
    if (dto.proFinancasId !== undefined)
      updateData.proFinancasId = dto.proFinancasId;

    const updated = await this.neighborhoodsRepository.update(id, updateData);
    return NeighborhoodResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.neighborhoodsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Bairro não encontrado');
    }
    await this.neighborhoodsRepository.delete(id);
  }
}
