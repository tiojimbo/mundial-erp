import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SectorsRepository } from './sectors.repository';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { SectorResponseDto } from './dto/sector-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class SectorsService {
  constructor(private readonly sectorsRepository: SectorsRepository) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async create(dto: CreateSectorDto): Promise<SectorResponseDto> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.sectorsRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Setor com este nome já existe');
    }

    const entity = await this.sectorsRepository.create({
      name: dto.name,
      slug,
      department: { connect: { id: dto.departmentId } },
    });

    return SectorResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.sectorsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(SectorResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<SectorResponseDto> {
    const entity = await this.sectorsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Setor não encontrado');
    }
    return SectorResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateSectorDto): Promise<SectorResponseDto> {
    const entity = await this.sectorsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Setor não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
      const existingSlug = await this.sectorsRepository.findBySlug(updateData.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Setor com este nome já existe');
      }
    }
    if (dto.departmentId !== undefined) {
      updateData.department = { connect: { id: dto.departmentId } };
    }

    const updated = await this.sectorsRepository.update(id, updateData);
    return SectorResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.sectorsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Setor não encontrado');
    }
    await this.sectorsRepository.softDelete(id);
  }
}
