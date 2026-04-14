import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { BullModule } from '@nestjs/bullmq';
import { ELASTICSEARCH_CLIENT } from './search.constants';
import { SearchHealthIndicator } from './search.health';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchRepository } from './search.repository';
import { SearchDataRepository } from './search-data.repository';
import { SearchIndexerService } from './search-indexer.service';
import { SearchReindexProcessor } from './search-reindex.processor';
import { DatabaseModule } from '../../database/database.module';
import { QUEUE_SEARCH_REINDEX } from '../queue/queue.constants';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: QUEUE_SEARCH_REINDEX }),
  ],
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Client({
          node: config.get('ELASTICSEARCH_URL'),
          requestTimeout: 5000,
          maxRetries: 2,
        });
      },
      inject: [ConfigService],
    },
    SearchHealthIndicator,
    SearchRepository,
    SearchDataRepository,
    SearchService,
    SearchIndexerService,
    SearchReindexProcessor,
  ],
  controllers: [SearchController],
  exports: [ELASTICSEARCH_CLIENT, SearchHealthIndicator, SearchService],
})
export class SearchModule {}
