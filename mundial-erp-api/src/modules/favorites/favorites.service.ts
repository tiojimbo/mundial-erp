import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FavoriteEntity, FavoritePosition } from '@prisma/client';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { FavoritesRepository } from './favorites.repository';
import { CreateFavoriteDto } from './dtos/create-favorite.dto';
import { FavoriteResponseDto } from './dtos/favorite-response.dto';
import { GroupedFavoritesResponseDto } from './dtos/grouped-favorites-response.dto';
import { CheckFavoriteResponseDto } from './dtos/check-favorite-response.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly repository: FavoritesRepository) {}

  async findAll(
    userId: string,
    workspaceId: string,
  ): Promise<GroupedFavoritesResponseDto> {
    const { items } = await this.repository.findAll(userId, workspaceId);
    const entityMap = await this.repository.hydrateEntities(workspaceId, items);

    const grouped: GroupedFavoritesResponseDto = {
      TOP: [],
      SIDEBAR: [],
      BOTTOM: [],
    };
    for (const entity of items) {
      const summary =
        entityMap.get(`${entity.entityType}:${entity.entityId}`) ?? null;
      const dto = FavoriteResponseDto.fromEntity(entity, summary);
      grouped[entity.position].push(dto);
    }
    return grouped;
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
    const entityMap = await this.repository.hydrateEntities(workspaceId, items);
    return {
      items: items.map((entity) =>
        FavoriteResponseDto.fromEntity(
          entity,
          entityMap.get(`${entity.entityType}:${entity.entityId}`) ?? null,
        ),
      ),
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
  ): Promise<CheckFavoriteResponseDto> {
    const existing = await this.repository.findByEntity(
      userId,
      workspaceId,
      entityType,
      entityId,
    );
    if (!existing) return { favorited: false, favorite: null };
    const entityMap = await this.repository.hydrateEntities(workspaceId, [
      existing,
    ]);
    return {
      favorited: true,
      favorite: FavoriteResponseDto.fromEntity(
        existing,
        entityMap.get(`${existing.entityType}:${existing.entityId}`) ?? null,
      ),
    };
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
      const entityMap = await this.repository.hydrateEntities(workspaceId, [
        existing,
      ]);
      return FavoriteResponseDto.fromEntity(
        existing,
        entityMap.get(`${existing.entityType}:${existing.entityId}`) ?? null,
      );
    }

    const entity = await this.repository.create({
      userId,
      workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      position: dto.position ?? FavoritePosition.SIDEBAR,
      order: dto.order ?? 0,
    });
    this.logger.log(
      `favorite.created user=${userId} ws=${workspaceId} type=${dto.entityType} entity=${dto.entityId} pos=${entity.position}`,
    );
    const entityMap = await this.repository.hydrateEntities(workspaceId, [
      entity,
    ]);
    return FavoriteResponseDto.fromEntity(
      entity,
      entityMap.get(`${entity.entityType}:${entity.entityId}`) ?? null,
    );
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
