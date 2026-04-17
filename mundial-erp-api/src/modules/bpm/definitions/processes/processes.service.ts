import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProcessesRepository } from './processes.repository';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ProcessResponseDto } from './dto/process-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class ProcessesService {
  constructor(private readonly processesRepository: ProcessesRepository) {}

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
    while (await this.processesRepository.findBySlug(slug)) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }

  async create(dto: CreateProcessDto): Promise<ProcessResponseDto> {
    if (!dto.areaId && !dto.departmentId && !dto.sectorId) {
      throw new BadRequestException(
        'Deve informar areaId, departmentId ou sectorId',
      );
    }

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.resolveUniqueSlug(baseSlug);

    // Se areaId fornecido, busca a area para preencher departmentId automaticamente
    let resolvedDepartmentId = dto.departmentId;
    if (dto.areaId) {
      const area = await this.processesRepository.findAreaById(dto.areaId);
      if (!area) {
        throw new NotFoundException('Área não encontrada');
      }
      resolvedDepartmentId = area.departmentId;
    }

    const createData: Prisma.ProcessCreateInput = {
      name: dto.name,
      slug,
      description: dto.description,
      isPrivate: dto.isPrivate ?? false,
      processType: dto.processType ?? 'LIST',
      status: dto.status,
      sortOrder: dto.sortOrder ?? 0,
      ...(dto.sectorId && { sector: { connect: { id: dto.sectorId } } }),
      ...(dto.areaId && { area: { connect: { id: dto.areaId } } }),
      ...(resolvedDepartmentId && {
        department: { connect: { id: resolvedDepartmentId } },
      }),
    };

    // Cria processo + ProcessView padrão em transação
    const entity = await this.processesRepository.createWithDefaultView(createData);

    return ProcessResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.processesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(ProcessResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ProcessResponseDto> {
    const entity = await this.processesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Processo não encontrado');
    }
    return ProcessResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateProcessDto): Promise<ProcessResponseDto> {
    const entity = await this.processesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Processo não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      const baseSlug = this.generateSlug(dto.name);
      const existingSlug = await this.processesRepository.findBySlug(baseSlug);
      if (!existingSlug || existingSlug.id === id) {
        updateData.slug = baseSlug;
      } else {
        updateData.slug = await this.resolveUniqueSlug(baseSlug);
      }
    }
    if (dto.sectorId !== undefined) {
      updateData.sector = { connect: { id: dto.sectorId } };
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPrivate !== undefined) updateData.isPrivate = dto.isPrivate;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.processesRepository.update(id, updateData);
    return ProcessResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.processesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Processo não encontrado');
    }
    await this.processesRepository.softDelete(id);
  }
}
