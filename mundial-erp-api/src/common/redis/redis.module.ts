import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

function buildRedisOptions(config: ConfigService): RedisOptions {
  const url = config.get<string>('REDIS_URL');
  if (url) {
    // Parse redis://:password@host:port
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      ...(parsed.password && { password: decodeURIComponent(parsed.password) }),
    };
  }
  const password = config.get<string>('REDIS_PASSWORD');
  return {
    host: config.get('REDIS_HOST'),
    port: config.get('REDIS_PORT'),
    ...(password && { password }),
  };
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const opts = buildRedisOptions(config);
        const client = new Redis({
          ...opts,
          maxRetriesPerRequest: 3,
          connectTimeout: 5000,
          family: 4,
          lazyConnect: true,
          retryStrategy(times) {
            if (times > 3) return null;
            return Math.min(2 ** times * 200, 5000);
          },
        });

        client.on('error', (err) => {
          logger.warn(`Redis: ${err.message}`);
        });

        client.on('connect', () => {
          logger.log('Redis connected');
        });

        client.connect().catch((err) => {
          logger.warn(`Redis unavailable: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
