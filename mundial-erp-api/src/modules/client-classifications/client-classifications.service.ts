import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientClassificationsRepository } from './client-classifications.repository';
import { CreateClientClassificationDto } from './dto/create-client-classification.dto';
import { UpdateClientClassificationDto } from './dto/update-client-classification.dto';
import { ClientClassificationResponseDto } from './dto/client-classification-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ClientClassificationsService {
  constructor(
    private readonly clientClassificationsRepository: ClientClassificationsRepository,
  ) {}

  async create(
    dto: CreateClientClassificationDto,
  ): Promise<ClientClassificationResponseDto> {
    const entity = await this.clientClassificationsRepository.create({
      name: dto.name,
      proFinancasId: dto.proFinancasId,
    });
    return ClientClassificationResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } =
      await this.clientClassificationsRepository.findMany({
        skip: pagination.skip,
        take: pagination.limit,
      });
    return {
      items: items.map(ClientClassificationResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ClientClassificationResponseDto> {
    const entity = await this.clientClassificationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Classificação de cliente não encontrada');
    }
    return ClientClassificationResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateClientClassificationDto,
  ): Promise<ClientClassificationResponseDto> {
    const entity = await this.clientClassificationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Classificação de cliente não encontrada');
    }
    const updated = await this.clientClassificationsRepository.update(id, dto);
    return ClientClassificationResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.clientClassificationsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Classificação de cliente não encontrada');
    }
    await this.clientClassificationsRepository.softDelete(id);
  }
}
