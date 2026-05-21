import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import type { NormalizedCnpjData } from './cnpj-lookup.types';

@Injectable()
export class CnpjLookupCache {
  private readonly logger = new Logger(CnpjLookupCache.name);
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.ttlSeconds = config.get<number>(
      'CNPJ_LOOKUP_CACHE_TTL_SECONDS',
      604_800,
    );
  }

  private key(cnpj: string): string {
    return `cnpj-lookup:${cnpj}`;
  }

  async get(cnpj: string): Promise<NormalizedCnpjData | null> {
    try {
      const raw = await this.redis.get(this.key(cnpj));
      return raw ? (JSON.parse(raw) as NormalizedCnpjData) : null;
    } catch (err) {
      // Redis indisponivel degrada para miss — nunca quebra o lookup.
      this.logger.warn(`cache get falhou: ${(err as Error).message}`);
      return null;
    }
  }

  async set(cnpj: string, data: NormalizedCnpjData): Promise<void> {
    try {
      await this.redis.set(
        this.key(cnpj),
        JSON.stringify(data),
        'EX',
        this.ttlSeconds,
      );
    } catch (err) {
      this.logger.warn(`cache set falhou: ${(err as Error).message}`);
    }
  }
}
