import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly departmentsRepository: DepartmentsRepository) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.departmentsRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Departamento com este nome já existe');
    }

    const entity = await this.departmentsRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      isPrivate: dto.isPrivate,
      sortOrder: dto.sortOrder ?? 0,
    });

    return DepartmentResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.departmentsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(DepartmentResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<DepartmentResponseDto> {
    const entity = await this.departmentsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return DepartmentResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentResponseDto> {
    const entity = await this.departmentsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
      const existingSlug = await this.departmentsRepository.findBySlug(updateData.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Departamento com este nome já existe');
      }
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.departmentsRepository.update(id, updateData);
    return DepartmentResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.departmentsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }
    if (entity.isProtected) {
      throw new ForbiddenException('Departamento protegido não pode ser removido');
    }
    await this.departmentsRepository.softDelete(id);
  }

  async getSidebarTree() {
    return this.departmentsRepository.getSidebarTree();
  }
}
