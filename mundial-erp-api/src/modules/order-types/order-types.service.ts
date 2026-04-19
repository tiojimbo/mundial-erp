import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderTypesRepository } from './order-types.repository';
import { CreateOrderTypeDto } from './dto/create-order-type.dto';
import { UpdateOrderTypeDto } from './dto/update-order-type.dto';
import { OrderTypeResponseDto } from './dto/order-type-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class OrderTypesService {
  constructor(private readonly orderTypesRepository: OrderTypesRepository) {}

  async create(dto: CreateOrderTypeDto): Promise<OrderTypeResponseDto> {
    const entity = await this.orderTypesRepository.create({
      name: dto.name,
      proFinancasId: dto.proFinancasId,
    });
    return OrderTypeResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.orderTypesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(OrderTypeResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<OrderTypeResponseDto> {
    const entity = await this.orderTypesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Tipo de pedido não encontrado');
    }
    return OrderTypeResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateOrderTypeDto,
  ): Promise<OrderTypeResponseDto> {
    const entity = await this.orderTypesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Tipo de pedido não encontrado');
    }
    const updated = await this.orderTypesRepository.update(id, dto);
    return OrderTypeResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.orderTypesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Tipo de pedido não encontrado');
    }
    await this.orderTypesRepository.softDelete(id);
  }
}
