import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethodsRepository } from './payment-methods.repository';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly paymentMethodsRepository: PaymentMethodsRepository) {}

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethodResponseDto> {
    const entity = await this.paymentMethodsRepository.create({
      name: dto.name,
      isActive: dto.isActive ?? true,
      proFinancasId: dto.proFinancasId,
    });
    return PaymentMethodResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.paymentMethodsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(PaymentMethodResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<PaymentMethodResponseDto> {
    const entity = await this.paymentMethodsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Método de pagamento não encontrado');
    }
    return PaymentMethodResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethodResponseDto> {
    const entity = await this.paymentMethodsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Método de pagamento não encontrado');
    }
    const updated = await this.paymentMethodsRepository.update(id, dto);
    return PaymentMethodResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.paymentMethodsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Método de pagamento não encontrado');
    }
    await this.paymentMethodsRepository.softDelete(id);
  }
}
