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
import { SpacesRepository } from '../../../spaces/spaces.repository';

@Injectable()
export class SectorsService {
  constructor(
    private readonly sectorsRepository: SectorsRepository,
    private readonly spacesRepository: SpacesRepository,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async assertSpaceInWorkspace(
    workspaceId: string,
    spaceId: string,
  ) {
    const space = await this.spacesRepository.findById(workspaceId, spaceId);
    if (!space) {
      throw new NotFoundException('Departamento não encontrado');
    }
  }

  async create(
    workspaceId: string,
    dto: CreateSectorDto,
  ): Promise<SectorResponseDto> {
    await this.assertSpaceInWorkspace(workspaceId, dto.spaceId);

    const slug = this.generateSlug(dto.name);

    const existing = await this.sectorsRepository.findBySlug(workspaceId, slug);
    if (existing) {
      throw new ConflictException('Setor com este nome já existe');
    }

    const entity = await this.sectorsRepository.create(workspaceId, {
      name: dto.name,
      slug,
      space: { connect: { id: dto.spaceId } },
    });

    return SectorResponseDto.fromEntity(entity);
  }

  async findAll(workspaceId: string, pagination: PaginationDto) {
    const { items, total } = await this.sectorsRepository.findMany(
      workspaceId,
      {
        skip: pagination.skip,
        take: pagination.limit,
      },
    );
    return {
      items: items.map(SectorResponseDto.fromEntity),
      total,
    };
  }

  async findById(workspaceId: string, id: string): Promise<SectorResponseDto> {
    const entity = await this.sectorsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Setor não encontrado');
    }
    return SectorResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateSectorDto,
  ): Promise<SectorResponseDto> {
    const entity = await this.sectorsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Setor não encontrado');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = this.generateSlug(dto.name);
      const existingSlug = await this.sectorsRepository.findBySlug(
        workspaceId,
        updateData.slug,
      );
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Setor com este nome já existe');
      }
    }
    if (dto.spaceId !== undefined) {
      await this.assertSpaceInWorkspace(workspaceId, dto.spaceId);
      updateData.space = { connect: { id: dto.spaceId } };
    }

    const updated = await this.sectorsRepository.update(
      workspaceId,
      id,
      updateData,
    );
    return SectorResponseDto.fromEntity(updated);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.sectorsRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Setor não encontrado');
    }
    await this.sectorsRepository.softDelete(workspaceId, id);
  }
}
