import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductDepartmentsRepository } from './product-departments.repository';
import { CreateProductDepartmentDto } from './dto/create-product-department.dto';
import { UpdateProductDepartmentDto } from './dto/update-product-department.dto';
import { ProductDepartmentResponseDto } from './dto/product-department-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ProductDepartmentsService {
  constructor(
    private readonly productDepartmentsRepository: ProductDepartmentsRepository,
  ) {}

  async create(
    dto: CreateProductDepartmentDto,
  ): Promise<ProductDepartmentResponseDto> {
    const existing = await this.productDepartmentsRepository.findByName(
      dto.name,
    );
    if (existing) {
      throw new ConflictException('Departamento de produto já cadastrado');
    }
    const entity = await this.productDepartmentsRepository.create({
      name: dto.name,
      ...(dto.proFinancasId !== undefined && {
        proFinancasId: dto.proFinancasId,
      }),
    });
    return ProductDepartmentResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.productDepartmentsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return { items: items.map(ProductDepartmentResponseDto.fromEntity), total };
  }

  async findById(id: string): Promise<ProductDepartmentResponseDto> {
    const entity = await this.productDepartmentsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Departamento de produto não encontrado');
    }
    return ProductDepartmentResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateProductDepartmentDto,
  ): Promise<ProductDepartmentResponseDto> {
    const entity = await this.productDepartmentsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Departamento de produto não encontrado');
    }
    if (dto.name && dto.name !== entity.name) {
      const existing = await this.productDepartmentsRepository.findByName(
        dto.name,
      );
      if (existing) {
        throw new ConflictException('Departamento de produto já cadastrado');
      }
    }
    const updated = await this.productDepartmentsRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.proFinancasId !== undefined && {
        proFinancasId: dto.proFinancasId,
      }),
    });
    return ProductDepartmentResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.productDepartmentsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Departamento de produto não encontrado');
    }
    await this.productDepartmentsRepository.softDelete(id);
  }
}
