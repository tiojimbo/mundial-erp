import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CitiesRepository } from './cities.repository';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CityResponseDto } from './dto/city-response.dto';
import { NeighborhoodResponseDto } from '../neighborhoods/dto/neighborhood-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class CitiesService {
  constructor(private readonly citiesRepository: CitiesRepository) {}

  async create(dto: CreateCityDto): Promise<CityResponseDto> {
    const entity = await this.citiesRepository.create({
      name: dto.name,
      state: { connect: { id: dto.stateId } },
      ibgeCode: dto.ibgeCode,
      proFinancasId: dto.proFinancasId,
    });

    return CityResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.citiesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(CityResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<CityResponseDto> {
    const entity = await this.citiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cidade não encontrada');
    }
    return CityResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateCityDto): Promise<CityResponseDto> {
    const entity = await this.citiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cidade não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.stateId !== undefined) updateData.state = { connect: { id: dto.stateId } };
    if (dto.ibgeCode !== undefined) updateData.ibgeCode = dto.ibgeCode;
    if (dto.proFinancasId !== undefined) updateData.proFinancasId = dto.proFinancasId;

    const updated = await this.citiesRepository.update(id, updateData);
    return CityResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.citiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cidade não encontrada');
    }
    await this.citiesRepository.delete(id);
  }

  async findNeighborhoodsByCity(id: string, pagination: PaginationDto) {
    const entity = await this.citiesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Cidade não encontrada');
    }

    const { items, total } = await this.citiesRepository.findNeighborhoodsByCity(id, {
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      items: items.map(NeighborhoodResponseDto.fromEntity),
      total,
    };
  }
}
