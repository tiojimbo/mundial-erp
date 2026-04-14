import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AreasRepository } from './areas.repository';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreaResponseDto } from './dto/area-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class AreasService {
  constructor(private readonly areasRepository: AreasRepository) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(dto: CreateAreaDto): Promise<AreaResponseDto> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.areasRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Área com este nome já existe');
    }

    const entity = await this.areasRepository.create({
      name: dto.name,
      slug,
      sortOrder: dto.sortOrder ?? 0,
      department: { connect: { id: dto.departmentId } },
    });

    return AreaResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.areasRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(AreaResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<AreaResponseDto> {
    const entity = await this.areasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    return AreaResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponseDto> {
    const entity = await this.areasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
      const existingSlug = await this.areasRepository.findBySlug(updateData.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Área com este nome já existe');
      }
    }
    if (dto.departmentId !== undefined) {
      updateData.department = { connect: { id: dto.departmentId } };
    }
    if (dto.sortOrder !== undefined) {
      updateData.sortOrder = dto.sortOrder;
    }

    const updated = await this.areasRepository.update(id, updateData);
    return AreaResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.areasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Área não encontrada');
    }
    if (entity.isDefault) {
      throw new BadRequestException('Não é possível excluir uma área padrão');
    }
    await this.areasRepository.softDelete(id);
  }
}
