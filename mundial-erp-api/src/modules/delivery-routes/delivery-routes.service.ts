import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryRoutesRepository } from './delivery-routes.repository';
import { CreateDeliveryRouteDto } from './dto/create-delivery-route.dto';
import { UpdateDeliveryRouteDto } from './dto/update-delivery-route.dto';
import { DeliveryRouteResponseDto } from './dto/delivery-route-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class DeliveryRoutesService {
  constructor(
    private readonly deliveryRoutesRepository: DeliveryRoutesRepository,
  ) {}

  async create(dto: CreateDeliveryRouteDto): Promise<DeliveryRouteResponseDto> {
    const entity = await this.deliveryRoutesRepository.create({
      name: dto.name,
      proFinancasId: dto.proFinancasId,
    });
    return DeliveryRouteResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.deliveryRoutesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(DeliveryRouteResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<DeliveryRouteResponseDto> {
    const entity = await this.deliveryRoutesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Rota de entrega não encontrada');
    }
    return DeliveryRouteResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateDeliveryRouteDto,
  ): Promise<DeliveryRouteResponseDto> {
    const entity = await this.deliveryRoutesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Rota de entrega não encontrada');
    }
    const updated = await this.deliveryRoutesRepository.update(id, dto);
    return DeliveryRouteResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.deliveryRoutesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Rota de entrega não encontrada');
    }
    await this.deliveryRoutesRepository.softDelete(id);
  }
}
