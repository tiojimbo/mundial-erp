import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusCategory } from '@prisma/client';
import { DepartmentsRepository } from './departments.repository';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { PrismaService } from '../../../../database/prisma.service';

/**
 * Default workflow statuses que todo department novo recebe.
 * Espelha `prisma/seed-bpm.ts` §2c. Se estes nao existem, nenhuma Task
 * consegue ser criada nesse department (tasks.service.ts resolve o primeiro
 * status NOT_STARTED ao criar a task e lanca 400 se nao encontrar).
 */
const DEFAULT_WORKFLOW_STATUSES = [
  { name: 'Para Fazer', category: StatusCategory.NOT_STARTED, color: '#94a3b8', sortOrder: 1 },
  { name: 'Em Andamento', category: StatusCategory.ACTIVE, color: '#3b82f6', sortOrder: 2 },
  { name: 'Concluído', category: StatusCategory.DONE, color: '#22c55e', sortOrder: 3 },
  { name: 'Finalizado', category: StatusCategory.CLOSED, color: '#16a34a', sortOrder: 4 },
] as const;

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departmentsRepository: DepartmentsRepository,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async resolveUniqueSlug(
    workspaceId: string,
    baseSlug: string,
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 0;
    while (await this.departmentsRepository.slugExists(workspaceId, slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  async create(
    workspaceId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(workspaceId, baseSlug);

    try {
      // Department + workflow statuses default em uma unica tx: se statuses
      // falham, o department nao persiste (caso contrario /tasks para esse
      // department ficaria bloqueado com 400 ate backfill manual).
      const entity = await this.prisma.$transaction(async (tx) => {
        const created = await tx.department.create({
          data: {
            name: dto.name,
            slug,
            description: dto.description,
            icon: dto.icon,
            color: dto.color,
            isPrivate: dto.isPrivate,
            sortOrder: dto.sortOrder ?? 0,
            workspace: { connect: { id: workspaceId } },
          },
        });
        for (const status of DEFAULT_WORKFLOW_STATUSES) {
          await tx.workflowStatus.create({
            data: {
              name: status.name,
              category: status.category,
              color: status.color,
              sortOrder: status.sortOrder,
              isDefault: true,
              department: { connect: { id: created.id } },
            },
          });
        }
        return created;
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

  async findAll(workspaceId: string, pagination: PaginationDto) {
    const { items, total } = await this.departmentsRepository.findMany(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
      },
    );
    return {
      items: items.map(DepartmentResponseDto.fromEntity),
      total,
    };
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<DepartmentResponseDto> {
    const entity = await this.departmentsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return DepartmentResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    const entity = await this.departmentsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      updateData.slug =
        entity.slug === baseSlug
          ? baseSlug
          : await this.resolveUniqueSlug(workspaceId, baseSlug);
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    try {
      const updated = await this.departmentsRepository.update(
        workspaceId,
        id,
        updateData,
      );
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

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.departmentsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }
    if (entity.isProtected) {
      throw new ForbiddenException(
        'Departamento protegido não pode ser removido',
      );
    }
    await this.departmentsRepository.softDelete(workspaceId, id);
  }

  async getSidebarTree(workspaceId: string) {
    const departments =
      await this.departmentsRepository.getSidebarTree(workspaceId);
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

  async getProcessSummaries(
    workspaceId: string,
    departmentId: string,
    showClosed = false,
  ) {
    const entity = await this.departmentsRepository.findById(
      workspaceId,
      departmentId,
    );
    if (!entity) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return this.departmentsRepository.getProcessSummaries(
      workspaceId,
      departmentId,
      showClosed,
    );
  }

  async findBySlug(workspaceId: string, slug: string) {
    const entity = await this.departmentsRepository.findBySlugWithDetails(
      workspaceId,
      slug,
    );
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
