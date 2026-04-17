import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    while (await this.departmentsRepository.slugExists(slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    try {
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Departamento com este nome já existe');
      }
      throw error;
    }
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
      const baseSlug = this.generateSlug(dto.name);
      updateData.slug = entity.slug === baseSlug
        ? baseSlug
        : await this.resolveUniqueSlug(baseSlug);
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    try {
      const updated = await this.departmentsRepository.update(id, updateData);
      return DepartmentResponseDto.fromEntity(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Departamento com este nome já existe');
      }
      throw error;
    }
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
    const departments = await this.departmentsRepository.getSidebarTree();
    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      description: dept.description,
      icon: dept.icon,
      color: dept.color,
      isPrivate: dept.isPrivate,
      isDefault: dept.isDefault,
      isProtected: dept.isProtected,
      sortOrder: dept.sortOrder,
      areas: dept.areas,
      directProcesses: dept.processes,
    }));
  }

  async getProcessSummaries(departmentId: string, showClosed = false) {
    const entity = await this.departmentsRepository.findById(departmentId);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return this.departmentsRepository.getProcessSummaries(
      departmentId,
      showClosed,
    );
  }

  async findBySlug(slug: string) {
    const entity = await this.departmentsRepository.findBySlugWithDetails(slug);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }

    return {
      ...DepartmentResponseDto.fromEntity(entity),
      areas: entity.areas.map((area) => ({
        id: area.id,
        name: area.name,
        slug: area.slug,
        description: area.description,
        isPrivate: area.isPrivate,
        processCount: area._count.processes,
      })),
      directProcesses: entity.processes.map((proc) => ({
        id: proc.id,
        name: proc.name,
        slug: proc.slug,
        processType: proc.processType,
        featureRoute: proc.featureRoute,
        description: proc.description,
        isPrivate: proc.isPrivate,
      })),
    };
  }
}
