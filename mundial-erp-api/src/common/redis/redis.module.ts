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
        logger.log(
          `Redis config: host=${opts.host}, port=${opts.port}, hasPassword=${!!opts.password}`,
        );
        const client = new Redis({
          ...opts,
          maxRetriesPerRequest: 3,
          connectTimeout: 3000,
          family: 0,
          lazyConnect: true,
          enableOfflineQueue: true,
          retryStrategy(times) {
            if (times > 2) {
              logger.warn(`Redis: giving up after ${times} retries`);
              return null;
            }
            return Math.min(2 ** times * 500, 3000);
          },
        });

        let lastErrorMsg = '';
        client.on('error', (err) => {
          if (err.message !== lastErrorMsg) {
            logger.warn(`Redis: ${err.message}`);
            lastErrorMsg = err.message;
          }
        });

        client.on('connect', () => {
          logger.log('Redis connected');
        });

        client.connect().catch((err) => {
          logger.warn(
            `Redis unavailable at startup: ${err.message}. App will continue without Redis.`,
          );
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
