import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { CustomTaskTypesRepository } from './custom-task-types.repository';
import { CustomTaskTypeResponseDto } from './dtos/custom-task-type-response.dto';
import { CustomTaskTypeFiltersDto } from './dtos/custom-task-type-filters.dto';
import { CreateCustomTaskTypeDto } from './dtos/create-custom-task-type.dto';
import { UpdateCustomTaskTypeDto } from './dtos/update-custom-task-type.dto';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';

const BUILTIN_LOCK_MESSAGE = 'Builtin custom task types are read-only';
const NAME_CONFLICT_MESSAGE =
  'Ja existe um tipo de tarefa com esse nome neste workspace.';
const NOT_FOUND_MESSAGE = 'Custom task type nao encontrado';
const SPACE_NOT_FOUND_MESSAGE = 'Space nao encontrado';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class CustomTaskTypesService {
  private readonly logger = new Logger(CustomTaskTypesService.name);

  static readonly INVALIDATION_CHANNEL = 'CUSTOM_TASK_TYPES_INVALIDATED';
  private static readonly CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly repository: CustomTaskTypesRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.subscribeInvalidation();
  }

  private cacheKey(workspaceId: string, filters: CustomTaskTypeFiltersDto) {
    const search = filters.search ? `s=${filters.search.toLowerCase()}` : '';
    return `custom-task-types:ws:${workspaceId}:p=${filters.page}:l=${filters.limit}:${search}`;
  }

  private cacheIdKey(workspaceId: string, id: string) {
    return `custom-task-types:ws:${workspaceId}:id:${id}`;
  }

  async list(
    workspaceId: string,
    filters: CustomTaskTypeFiltersDto,
  ): Promise<{
    data: CustomTaskTypeResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const key = this.cacheKey(workspaceId, filters);
    const cached = await this.safeGet(key);
    if (cached) {
      return JSON.parse(cached) as {
        data: CustomTaskTypeResponseDto[];
        meta: { total: number; page: number; limit: number };
      };
    }

    const { items, total } = await this.repository.findMany(workspaceId, {
      skip: filters.skip,
      take: filters.limit,
      search: filters.search,
    });

    const payload = {
      data: items.map((i) => CustomTaskTypeResponseDto.fromEntity(i)),
      meta: { total, page: filters.page, limit: filters.limit },
    };

    await this.safeSet(key, JSON.stringify(payload));
    return payload;
  }

  async listBySpace(
    workspaceId: string,
    spaceId: string,
  ): Promise<CustomTaskTypeResponseDto[]> {
    const ok = await this.repository.spaceBelongsToWorkspace(
      workspaceId,
      spaceId,
    );
    if (!ok) {
      throw new NotFoundException(SPACE_NOT_FOUND_MESSAGE);
    }
    const items = await this.repository.findManyBySpace(workspaceId, spaceId);
    return items.map((i) => CustomTaskTypeResponseDto.fromEntity(i));
  }

  async listFlatForWorkspace(
    workspaceId: string,
  ): Promise<CustomTaskTypeResponseDto[]> {
    const items = await this.repository.findAllForWorkspaceFlat(workspaceId);
    const seen = new Set<string>();
    const deduped = items.filter((i) => {
      const key = i.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped.map((i) => CustomTaskTypeResponseDto.fromEntity(i));
  }

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<CustomTaskTypeResponseDto> {
    const key = this.cacheIdKey(workspaceId, id);
    const cached = await this.safeGet(key);
    if (cached) {
      return JSON.parse(cached) as CustomTaskTypeResponseDto;
    }

    const entity = await this.repository.findById(id, workspaceId);
    if (!entity) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    const dto = CustomTaskTypeResponseDto.fromEntity(entity);
    await this.safeSet(key, JSON.stringify(dto));
    return dto;
  }

  async create(
    workspaceId: string,
    dto: CreateCustomTaskTypeDto,
    creatorId: string,
    spaceId?: string,
  ): Promise<CustomTaskTypeResponseDto> {
    const name = dto.value.trim();
    const namePlural = dto.pluralName?.trim() || null;
    const description = dto.description?.trim() || null;

    if (spaceId) {
      const ok = await this.repository.spaceBelongsToWorkspace(
        workspaceId,
        spaceId,
      );
      if (!ok) {
        throw new NotFoundException(SPACE_NOT_FOUND_MESSAGE);
      }
    }

    if (await this.repository.nameExists(workspaceId, name)) {
      throw new ConflictException(NAME_CONFLICT_MESSAGE);
    }

    let entity;
    try {
      entity = await this.repository.create(workspaceId, {
        name,
        namePlural,
        description,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        spaceId: spaceId ?? null,
        creatorId,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(NAME_CONFLICT_MESSAGE);
      }
      throw error;
    }

    await this.publishInvalidation(`ws:${workspaceId}`);

    return CustomTaskTypeResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateCustomTaskTypeDto,
    opts?: { expectedSpaceId?: string },
  ): Promise<CustomTaskTypeResponseDto> {
    const visible = await this.repository.findById(id, workspaceId);
    if (!visible) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    if (visible.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    if (visible.workspaceId !== null && visible.workspaceId !== workspaceId) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    if (
      opts?.expectedSpaceId !== undefined &&
      visible.spaceId !== opts.expectedSpaceId
    ) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    const name = dto.value?.trim();
    if (name && name.toLowerCase() !== visible.name.toLowerCase()) {
      if (await this.repository.nameExists(workspaceId, name)) {
        throw new ConflictException(NAME_CONFLICT_MESSAGE);
      }
    }

    let updated;
    try {
      updated = await this.repository.update(id, {
        name: name ?? undefined,
        namePlural:
          dto.pluralName === undefined
            ? undefined
            : dto.pluralName?.trim() || null,
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        icon: dto.icon === undefined ? undefined : (dto.icon ?? null),
        color: dto.color === undefined ? undefined : (dto.color ?? null),
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(NAME_CONFLICT_MESSAGE);
      }
      throw error;
    }

    await this.publishInvalidation(`ws:${workspaceId}`);

    return CustomTaskTypeResponseDto.fromEntity(updated);
  }

  async remove(
    workspaceId: string,
    id: string,
    opts?: { expectedSpaceId?: string },
  ): Promise<void> {
    const row = await this.repository.findByIdIncludingDeleted(id, workspaceId);
    if (!row) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    if (row.isBuiltin) {
      throw new ForbiddenException(BUILTIN_LOCK_MESSAGE);
    }
    if (row.workspaceId !== null && row.workspaceId !== workspaceId) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    if (
      opts?.expectedSpaceId !== undefined &&
      row.spaceId !== opts.expectedSpaceId
    ) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    if (row.deletedAt !== null) {
      return;
    }

    await this.repository.softDeleteWithCascadeNull(id);
    await this.publishInvalidation(`ws:${workspaceId}`);
  }

  private async publishInvalidation(payload: string): Promise<void> {
    await this.invalidateByMessage(payload);
    try {
      await this.redis.publish(
        CustomTaskTypesService.INVALIDATION_CHANNEL,
        payload,
      );
    } catch (err) {
      this.logger.warn(
        `Redis PUBLISH fail (${payload}): ${(err as Error).message}`,
      );
    }
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (err) {
      this.logger.warn(`Redis GET fail (${key}): ${(err as Error).message}`);
      return null;
    }
  }

  private async safeSet(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(
        key,
        value,
        'EX',
        CustomTaskTypesService.CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Redis SET fail (${key}): ${(err as Error).message}`);
    }
  }

  private subscribeInvalidation(): void {
    try {
      const subscriber = this.redis.duplicate();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      subscriber.subscribe(
        CustomTaskTypesService.INVALIDATION_CHANNEL,
        (err) => {
          if (err) {
            this.logger.warn(
              `Redis SUBSCRIBE fail: ${err.message}; cache invalidation disabled.`,
            );
          }
        },
      );
      subscriber.on('message', (_channel, message) => {
        this.invalidateByMessage(message).catch((err) => {
          this.logger.warn(
            `Cache invalidation fail: ${(err as Error).message}`,
          );
        });
      });
    } catch (err) {
      this.logger.warn(
        `Redis subscribe init fail: ${(err as Error).message}; invalidation disabled.`,
      );
    }
  }

  private async invalidateByMessage(message: string): Promise<void> {
    const pattern =
      message === '*'
        ? 'custom-task-types:*'
        : `custom-task-types:${message}:*`;
    const keys: string[] = [];
    try {
      const stream = this.redis.scanStream({ match: pattern, count: 200 });
      for await (const chunk of stream) {
        keys.push(...(chunk as string[]));
      }
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`SCAN/DEL fail (${pattern}): ${(err as Error).message}`);
    }
  }
}
