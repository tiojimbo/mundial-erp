import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FavoriteEntity } from '@prisma/client';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { FavoritesRepository } from './favorites.repository';
import { CreateFavoriteDto } from './dtos/create-favorite.dto';
import { FavoriteResponseDto } from './dtos/favorite-response.dto';
import { GroupedFavoritesResponseDto } from './dtos/grouped-favorites-response.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly repository: FavoritesRepository) {}

  async findAll(
    userId: string,
    workspaceId: string,
    pagination: PaginationDto,
  ): Promise<GroupedFavoritesResponseDto> {
    const { items, total } = await this.repository.findAll(userId, workspaceId, {
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      TOP: [],
      SIDEBAR: items.map((entity) => FavoriteResponseDto.fromEntity(entity)),
      BOTTOM: [],
      total,
    };
  }

  async findByEntityType(
    userId: string,
    workspaceId: string,
    entityType: FavoriteEntity,
    pagination: PaginationDto,
  ) {
    const { items, total } = await this.repository.findAll(userId, workspaceId, {
      entityType,
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map((entity) => FavoriteResponseDto.fromEntity(entity)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async check(
    userId: string,
    workspaceId: string,
    entityType: FavoriteEntity,
    entityId: string,
  ): Promise<{ isFavorite: boolean; favoriteId?: string }> {
    const existing = await this.repository.findByEntity(
      userId,
      workspaceId,
      entityType,
      entityId,
    );
    return existing
      ? { isFavorite: true, favoriteId: existing.id }
      : { isFavorite: false };
  }

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateFavoriteDto,
  ): Promise<FavoriteResponseDto> {
    const exists = await this.repository.existsInWorkspace(
      workspaceId,
      dto.entityType,
      dto.entityId,
    );
    if (!exists) {
      throw new NotFoundException('Entidade nao encontrada no workspace');
    }

    const existing = await this.repository.findByEntity(
      userId,
      workspaceId,
      dto.entityType,
      dto.entityId,
    );
    if (existing) {
      return FavoriteResponseDto.fromEntity(existing);
    }

    const entity = await this.repository.create({
      userId,
      workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      position: dto.position ?? 0,
    });
    this.logger.log(
      `favorite.created user=${userId} ws=${workspaceId} type=${dto.entityType} entity=${dto.entityId}`,
    );
    return FavoriteResponseDto.fromEntity(entity);
  }

  async remove(userId: string, workspaceId: string, id: string): Promise<void> {
    const existing = await this.repository.findOne(userId, workspaceId, id);
    if (!existing) {
      throw new NotFoundException('Favorito nao encontrado');
    }
    await this.repository.delete(id);
    this.logger.log(
      `favorite.deleted user=${userId} ws=${workspaceId} id=${id} type=${existing.entityType} entity=${existing.entityId}`,
    );
  }
}
