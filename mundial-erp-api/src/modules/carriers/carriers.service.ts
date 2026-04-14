import { Injectable, NotFoundException } from '@nestjs/common';
import { CarriersRepository } from './carriers.repository';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { CarrierResponseDto } from './dto/carrier-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class CarriersService {
  constructor(private readonly carriersRepository: CarriersRepository) {}

  async create(dto: CreateCarrierDto): Promise<CarrierResponseDto> {
    const entity = await this.carriersRepository.create({
      name: dto.name,
      proFinancasId: dto.proFinancasId,
    });
    return CarrierResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.carriersRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(CarrierResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<CarrierResponseDto> {
    const entity = await this.carriersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Transportadora não encontrada');
    }
    return CarrierResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateCarrierDto): Promise<CarrierResponseDto> {
    const entity = await this.carriersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Transportadora não encontrada');
    }
    const updated = await this.carriersRepository.update(id, dto);
    return CarrierResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.carriersRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Transportadora não encontrada');
    }
    await this.carriersRepository.softDelete(id);
  }
}
