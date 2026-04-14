import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductTypesRepository } from './product-types.repository';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductTypeResponseDto } from './dto/product-type-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ProductTypesService {
  constructor(private readonly productTypesRepository: ProductTypesRepository) {}

  async create(dto: CreateProductTypeDto): Promise<ProductTypeResponseDto> {
    const existing = await this.productTypesRepository.findByPrefix(dto.prefix);
    if (existing) {
      throw new ConflictException('Prefixo já cadastrado');
    }

    const productType = await this.productTypesRepository.create({
      prefix: dto.prefix,
      name: dto.name,
      eanDeptCode: dto.eanDeptCode,
    });

    return ProductTypeResponseDto.fromEntity(productType);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.productTypesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(ProductTypeResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ProductTypeResponseDto> {
    const productType = await this.productTypesRepository.findById(id);
    if (!productType) {
      throw new NotFoundException('Tipo de produto não encontrado');
    }
    return ProductTypeResponseDto.fromEntity(productType);
  }

  async update(id: string, dto: UpdateProductTypeDto): Promise<ProductTypeResponseDto> {
    const productType = await this.productTypesRepository.findById(id);
    if (!productType) {
      throw new NotFoundException('Tipo de produto não encontrado');
    }

    if (dto.prefix && dto.prefix !== productType.prefix) {
      const existing = await this.productTypesRepository.findByPrefix(dto.prefix);
      if (existing) {
        throw new ConflictException('Prefixo já cadastrado');
      }
    }

    const updated = await this.productTypesRepository.update(id, {
      ...(dto.prefix !== undefined && { prefix: dto.prefix }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.eanDeptCode !== undefined && { eanDeptCode: dto.eanDeptCode }),
    });

    return ProductTypeResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const productType = await this.productTypesRepository.findById(id);
    if (!productType) {
      throw new NotFoundException('Tipo de produto não encontrado');
    }
    await this.productTypesRepository.softDelete(id);
  }

  async getNextCode(id: string): Promise<{ code: string; barcode: string }> {
    const productType = await this.productTypesRepository.findById(id);
    if (!productType) {
      throw new NotFoundException('Tipo de produto não encontrado');
    }

    const nextSeq = productType.lastSequential + 1;
    const code = `${productType.prefix}-${String(nextSeq).padStart(4, '0')}`;

    // EAN-13: 2[DDDD][SSSSSSS][C] = 1+4+7+1 = 13 dígitos
    const raw = `2${productType.eanDeptCode}${String(nextSeq).padStart(7, '0')}`;
    const checkDigit = this.calculateEan13CheckDigit(raw);
    const barcode = `${raw}${checkDigit}`;

    return { code, barcode };
  }

  private calculateEan13CheckDigit(first12: string): number {
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) s1 += parseInt(first12[i]);
      else s2 += parseInt(first12[i]);
    }
    const total = s1 + s2 * 3;
    return (10 - (total % 10)) % 10;
  }
}
