import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { QUEUE_SEARCH_REINDEX } from '../queue/queue.constants';
import { Roles } from '../auth/decorators';
import { Role } from '@prisma/client';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    @InjectQueue(QUEUE_SEARCH_REINDEX) private readonly reindexQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Busca global full-text (Cmd+K)' })
  async search(
    @WorkspaceId() workspaceId: string,
    @Query() dto: SearchQueryDto,
  ) {
    return this.searchService.search(workspaceId, dto);
  }

  @Post('reindex')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reindexar todas as entidades no Elasticsearch (async via fila)',
  })
  async reindex() {
    const job = await this.reindexQueue.add(
      'reindex-all',
      {},
      {
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
    return { jobId: job.id, message: 'Reindexação enfileirada com sucesso' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Status do cluster Elasticsearch' })
  @ApiOkResponse({
    description: 'Cluster health',
    schema: {
      properties: {
        status: { type: 'string', example: 'green' },
        numberOfNodes: { type: 'number', example: 1 },
        activePrimaryShards: { type: 'number', example: 5 },
      },
    },
  })
  async health() {
    return this.searchService.health();
  }
}
