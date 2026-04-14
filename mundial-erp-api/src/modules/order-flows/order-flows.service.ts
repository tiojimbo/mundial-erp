import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderFlowsRepository } from './order-flows.repository';
import { CreateOrderFlowDto } from './dto/create-order-flow.dto';
import { UpdateOrderFlowDto } from './dto/update-order-flow.dto';
import { OrderFlowResponseDto } from './dto/order-flow-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class OrderFlowsService {
  constructor(private readonly orderFlowsRepository: OrderFlowsRepository) {}

  async create(dto: CreateOrderFlowDto): Promise<OrderFlowResponseDto> {
    const entity = await this.orderFlowsRepository.create({
      name: dto.name,
      proFinancasId: dto.proFinancasId,
    });
    return OrderFlowResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.orderFlowsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(OrderFlowResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<OrderFlowResponseDto> {
    const entity = await this.orderFlowsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fluxo de pedido não encontrado');
    }
    return OrderFlowResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateOrderFlowDto): Promise<OrderFlowResponseDto> {
    const entity = await this.orderFlowsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fluxo de pedido não encontrado');
    }
    const updated = await this.orderFlowsRepository.update(id, dto);
    return OrderFlowResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.orderFlowsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fluxo de pedido não encontrado');
    }
    await this.orderFlowsRepository.softDelete(id);
  }
}
