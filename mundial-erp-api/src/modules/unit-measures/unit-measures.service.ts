import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitMeasuresRepository } from './unit-measures.repository';
import { CreateUnitMeasureDto } from './dto/create-unit-measure.dto';
import { UpdateUnitMeasureDto } from './dto/update-unit-measure.dto';
import { UnitMeasureResponseDto } from './dto/unit-measure-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class UnitMeasuresService {
  constructor(
    private readonly unitMeasuresRepository: UnitMeasuresRepository,
  ) {}

  async create(dto: CreateUnitMeasureDto): Promise<UnitMeasureResponseDto> {
    const existing = await this.unitMeasuresRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Unidade de medida já cadastrada');
    }
    const entity = await this.unitMeasuresRepository.create({
      name: dto.name,
      ...(dto.proFinancasId !== undefined && {
        proFinancasId: dto.proFinancasId,
      }),
    });
    return UnitMeasureResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.unitMeasuresRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return { items: items.map(UnitMeasureResponseDto.fromEntity), total };
  }

  async findById(id: string): Promise<UnitMeasureResponseDto> {
    const entity = await this.unitMeasuresRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Unidade de medida não encontrada');
    }
    return UnitMeasureResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateUnitMeasureDto,
  ): Promise<UnitMeasureResponseDto> {
    const entity = await this.unitMeasuresRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Unidade de medida não encontrada');
    }
    if (dto.name && dto.name !== entity.name) {
      const existing = await this.unitMeasuresRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException('Unidade de medida já cadastrada');
      }
    }
    const updated = await this.unitMeasuresRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.proFinancasId !== undefined && {
        proFinancasId: dto.proFinancasId,
      }),
    });
    return UnitMeasureResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.unitMeasuresRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Unidade de medida não encontrada');
    }
    await this.unitMeasuresRepository.softDelete(id);
  }
}
