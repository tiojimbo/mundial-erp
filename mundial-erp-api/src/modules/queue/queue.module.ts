import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import {
  QUEUE_SYNC,
  QUEUE_REPORTS,
  QUEUE_SEARCH_REINDEX,
  QUEUE_KOMMO_WEBHOOKS,
  QUEUE_KOMMO_BACKFILL,
  QUEUE_AUTOMATION_EXECUTION,
} from './queue.constants';

function buildRedisOptions(config: ConfigService): RedisOptions {
  const url = config.get<string>('REDIS_URL');
  if (url) {
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

const RECONNECT_ON_ERROR_PATTERNS = ['READONLY', 'ECONNRESET'] as const;

function createBullConnection(config: ConfigService): Redis {
  const logger = new Logger('QueueModule');
  const opts = buildRedisOptions(config);
  const connection = new Redis({
    ...opts,
    maxRetriesPerRequest: null,
    connectTimeout: 3000,
    family: 0,
    lazyConnect: true,
    enableOfflineQueue: true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 1000, 10000);
      if (times === 1 || times % 10 === 0) {
        logger.warn(
          `BullMQ Redis: reconnect attempt ${times}, retrying in ${delay}ms`,
        );
      }
      return delay;
    },
    reconnectOnError(err: Error) {
      return RECONNECT_ON_ERROR_PATTERNS.some((pattern) =>
        err.message.includes(pattern),
      );
    },
  });

  connection.on('error', (err) => {
    logger.warn(`BullMQ Redis: ${err.message}`);
  });
  connection.on('ready', () => {
    logger.log('BullMQ Redis: ready');
  });
  connection.on('reconnecting', () => {
    logger.warn('BullMQ Redis: reconnecting');
  });

  connection.connect().catch((err) => {
    logger.warn(
      `BullMQ Redis unavailable: ${err.message}. Queues will retry until ready.`,
    );
  });

  return connection;
}

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: createBullConnection(config),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_SYNC },
      { name: QUEUE_REPORTS },
      { name: QUEUE_SEARCH_REINDEX },
      { name: QUEUE_KOMMO_WEBHOOKS },
      { name: QUEUE_KOMMO_BACKFILL },
      { name: QUEUE_AUTOMATION_EXECUTION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
