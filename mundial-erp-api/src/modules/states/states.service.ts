import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatesRepository } from './states.repository';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { StateResponseDto } from './dto/state-response.dto';
import { CityResponseDto } from '../cities/dto/city-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class StatesService {
  constructor(private readonly statesRepository: StatesRepository) {}

  async create(dto: CreateStateDto): Promise<StateResponseDto> {
    const existing = await this.statesRepository.findByUf(dto.uf);
    if (existing) {
      throw new ConflictException('Estado com esta UF já existe');
    }

    const entity = await this.statesRepository.create({
      name: dto.name,
      uf: dto.uf,
      proFinancasId: dto.proFinancasId,
    });

    return StateResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.statesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(StateResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<StateResponseDto> {
    const entity = await this.statesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Estado não encontrado');
    }
    return StateResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateStateDto): Promise<StateResponseDto> {
    const entity = await this.statesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Estado não encontrado');
    }

    if (dto.uf !== undefined) {
      const existingUf = await this.statesRepository.findByUf(dto.uf);
      if (existingUf && existingUf.id !== id) {
        throw new ConflictException('Estado com esta UF já existe');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.uf !== undefined) updateData.uf = dto.uf;
    if (dto.proFinancasId !== undefined) updateData.proFinancasId = dto.proFinancasId;

    const updated = await this.statesRepository.update(id, updateData);
    return StateResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.statesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Estado não encontrado');
    }
    await this.statesRepository.delete(id);
  }

  async findCitiesByState(id: string, pagination: PaginationDto) {
    const entity = await this.statesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Estado não encontrado');
    }

    const { items, total } = await this.statesRepository.findCitiesByState(id, {
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      items: items.map(CityResponseDto.fromEntity),
      total,
    };
  }
}
