import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderModelsRepository } from './order-models.repository';
import { CreateOrderModelDto } from './dto/create-order-model.dto';
import { UpdateOrderModelDto } from './dto/update-order-model.dto';
import { OrderModelResponseDto } from './dto/order-model-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class OrderModelsService {
  constructor(private readonly orderModelsRepository: OrderModelsRepository) {}

  async create(dto: CreateOrderModelDto): Promise<OrderModelResponseDto> {
    const entity = await this.orderModelsRepository.create({
      name: dto.name,
      proFinancasId: dto.proFinancasId,
    });
    return OrderModelResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.orderModelsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(OrderModelResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<OrderModelResponseDto> {
    const entity = await this.orderModelsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Modelo de pedido não encontrado');
    }
    return OrderModelResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateOrderModelDto): Promise<OrderModelResponseDto> {
    const entity = await this.orderModelsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Modelo de pedido não encontrado');
    }
    const updated = await this.orderModelsRepository.update(id, dto);
    return OrderModelResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.orderModelsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Modelo de pedido não encontrado');
    }
    await this.orderModelsRepository.softDelete(id);
  }
}
