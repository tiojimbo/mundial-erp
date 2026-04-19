import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

const PRESENCE_PREFIX = 'chat:presence:';
const SOCKET_MAP_PREFIX = 'chat:socket-user:';

@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(PresenceService.name);

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.buildRedisOptions());
  }

  private buildRedisOptions(): RedisOptions {
    const url = this.configService.get<string>('REDIS_URL');
    if (url) {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        ...(parsed.password && {
          password: decodeURIComponent(parsed.password),
        }),
      };
    }
    const password = this.configService.get<string>('REDIS_PASSWORD');
    return {
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      ...(password && { password }),
    };
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (error) {
      this.logger.warn('Failed to close Redis connection gracefully', error);
    }
  }

  async addSocket(userId: string, socketId: string): Promise<boolean> {
    const key = `${PRESENCE_PREFIX}${userId}`;
    const wasOffline = (await this.redis.scard(key)) === 0;
    await this.redis.sadd(key, socketId);
    await this.redis.set(`${SOCKET_MAP_PREFIX}${socketId}`, userId);
    return wasOffline;
  }

  async removeSocket(userId: string, socketId: string): Promise<boolean> {
    const key = `${PRESENCE_PREFIX}${userId}`;
    await this.redis.srem(key, socketId);
    await this.redis.del(`${SOCKET_MAP_PREFIX}${socketId}`);
    const remaining = await this.redis.scard(key);
    if (remaining === 0) {
      await this.redis.del(key);
      return true; // user went fully offline
    }
    return false;
  }

  async getSocketIds(userId: string): Promise<string[]> {
    return this.redis.smembers(`${PRESENCE_PREFIX}${userId}`);
  }

  async getUserIdBySocket(socketId: string): Promise<string | null> {
    return this.redis.get(`${SOCKET_MAP_PREFIX}${socketId}`);
  }

  async isOnline(userId: string): Promise<boolean> {
    const count = await this.redis.scard(`${PRESENCE_PREFIX}${userId}`);
    return count > 0;
  }

  /**
   * Returns all currently online user IDs.
   * Note: KEYS is O(N) — acceptable for chat presence but not suitable
   * for very large keyspaces. Consider SCAN if this grows significantly.
   */
  async getOnlineUserIds(): Promise<string[]> {
    const keys = await this.redis.keys(`${PRESENCE_PREFIX}*`);
    return keys.map((k) => k.replace(PRESENCE_PREFIX, ''));
  }
}
