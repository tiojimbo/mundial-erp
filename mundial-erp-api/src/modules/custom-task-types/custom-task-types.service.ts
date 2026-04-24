import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { CustomTaskTypesRepository } from './custom-task-types.repository';
import { CustomTaskTypeResponseDto } from './dtos/custom-task-type-response.dto';
import { CustomTaskTypeFiltersDto } from './dtos/custom-task-type-filters.dto';
import { CreateCustomTaskTypeDto } from './dtos/create-custom-task-type.dto';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';

/**
 * Service de CustomTaskType com cache Redis (TTL 5 min) por workspace.
 * Invalidacao via canal pub/sub `CUSTOM_TASK_TYPES_INVALIDATED` — publicada
 * por tool administrativo futuro (fora da API publica; §1.4 nao-objetivos).
 *
 * Contract: cross-tenant retorna 404 (nunca 403) — §8.1.
 */
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
  ): Promise<{ data: CustomTaskTypeResponseDto[]; meta: { total: number; page: number; limit: number } }> {
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
      // §8.1: cross-tenant -> 404
      throw new NotFoundException('Custom task type nao encontrado');
    }

    const dto = CustomTaskTypeResponseDto.fromEntity(entity);
    await this.safeSet(key, JSON.stringify(dto));
    return dto;
  }

  async create(
    workspaceId: string,
    dto: CreateCustomTaskTypeDto,
  ): Promise<CustomTaskTypeResponseDto> {
    const name = dto.name.trim();
    const namePlural = dto.namePlural?.trim() || null;
    const description = dto.description?.trim() || null;

    if (await this.repository.nameExists(workspaceId, name)) {
      throw new ConflictException(
        'Ja existe um tipo de tarefa com esse nome neste workspace.',
      );
    }

    const entity = await this.repository.create(workspaceId, {
      name,
      namePlural,
      description,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
    });

    await this.publishInvalidation(`ws:${workspaceId}`);

    return CustomTaskTypeResponseDto.fromEntity(entity);
  }

  private async publishInvalidation(payload: string): Promise<void> {
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

  /**
   * Assinatura do canal de invalidacao. Payload esperado: `ws:<id>` ou
   * `*` para flush global (builtins alterados). Robusto a Redis offline.
   */
  private subscribeInvalidation(): void {
    try {
      const subscriber = this.redis.duplicate();
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
    const pattern = message === '*'
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
