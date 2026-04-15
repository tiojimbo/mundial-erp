import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { QUEUE_SYNC, QUEUE_REPORTS, QUEUE_SEARCH_REINDEX } from './queue.constants';

function createBullConnection(config: ConfigService): Redis {
  const logger = new Logger('QueueModule');
  const password = config.get('REDIS_PASSWORD');
  const connection = new Redis({
    host: config.get('REDIS_HOST'),
    port: config.get('REDIS_PORT'),
    ...(password && { password }),
    maxRetriesPerRequest: null,
    family: 4,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(2 ** times * 200, 5000);
    },
  });

  connection.on('error', (err) => {
    logger.warn(`BullMQ Redis: ${err.message}`);
  });

  connection.connect().catch((err) => {
    logger.warn(`BullMQ Redis unavailable: ${err.message}`);
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
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
