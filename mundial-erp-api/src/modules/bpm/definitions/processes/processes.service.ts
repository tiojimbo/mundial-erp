import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async create(dto: CreateProcessDto): Promise<ProcessResponseDto> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.processesRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Processo com este nome já existe');
    }

    const entity = await this.processesRepository.create({
      name: dto.name,
      slug,
      sector: { connect: { id: dto.sectorId } },
      status: dto.status,
      sortOrder: dto.sortOrder ?? 0,
    });

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
      updateData.slug = this.generateSlug(dto.name);
      const existingSlug = await this.processesRepository.findBySlug(updateData.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Processo com este nome já existe');
      }
    }
    if (dto.sectorId !== undefined) {
      updateData.sector = { connect: { id: dto.sectorId } };
    }
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
