import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import type {
  MappingTypeMapping,
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ELASTICSEARCH_CLIENT,
  ALL_INDICES,
  INDEX_MAPPINGS,
} from './search.constants';

@Injectable()
export class SearchRepository implements OnModuleInit {
  private readonly logger = new Logger(SearchRepository.name);

  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly esClient: Client,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureIndices();
    } catch (error) {
      this.logger.warn(
        `Elasticsearch unavailable on startup: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Create indices if they don't exist, with proper mappings.
   */
  async ensureIndices(): Promise<void> {
    for (const index of ALL_INDICES) {
      try {
        const exists = await this.esClient.indices.exists({ index });
        if (!exists) {
          await this.esClient.indices.create({
            index,
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
            mappings: INDEX_MAPPINGS[index] as MappingTypeMapping,
          });
          this.logger.log(`Index "${index}" created`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to ensure index "${index}": ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Index (create or update) a single document.
   */
  async indexDocument(
    index: string,
    id: string,
    document: Record<string, unknown>,
  ): Promise<void> {
    await this.esClient.index({ index, id, document, refresh: 'wait_for' });
  }

  /**
   * Delete a single document from an index.
   */
  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.esClient.delete({ index, id, refresh: 'wait_for' });
    } catch (error: unknown) {
      const esError = error as { meta?: { statusCode?: number } };
      if (esError.meta?.statusCode === 404) {
        this.logger.debug(`Document "${id}" not found in "${index}", skipping delete`);
        return;
      }
      throw error;
    }
  }

  /**
   * Multi-index search with multi_match across all text fields.
   */
  async search(
    indices: string[],
    query: string,
    from: number,
    size: number,
  ): Promise<{
    hits: Array<{
      _id: string;
      _index: string;
      _score: number | null;
      _source?: Record<string, unknown>;
    }>;
    total: number;
  }> {
    const esQuery: QueryDslQueryContainer = {
      bool: {
        must: [
          {
            multi_match: {
              query,
              type: 'best_fields',
              fuzziness: 'AUTO',
              operator: 'or',
            },
          },
        ],
        must_not: [{ exists: { field: 'deletedAt' } }],
      },
    };

    const sort: SortCombinations[] = [
      '_score',
      { updatedAt: { order: 'desc', unmapped_type: 'date' } },
    ];

    const result = await this.esClient.search({
      index: indices.join(','),
      from,
      size,
      query: esQuery,
      sort,
    });

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value ?? 0;

    const hits = result.hits.hits.map((hit) => ({
      _id: hit._id!,
      _index: hit._index,
      _score: hit._score ?? null,
      _source: hit._source as Record<string, unknown> | undefined,
    }));

    return { hits, total };
  }

  /**
   * Bulk index documents (for reindexation).
   */
  async bulkIndex(
    operations: Array<{
      index: string;
      id: string;
      body: Record<string, unknown>;
    }>,
  ): Promise<{ errors: number; indexed: number }> {
    if (operations.length === 0) return { errors: 0, indexed: 0 };

    const bulkOps = operations.flatMap((op) => [
      { index: { _index: op.index, _id: op.id } },
      op.body,
    ]);

    const result = await this.esClient.bulk({
      operations: bulkOps,
      refresh: 'wait_for',
    });

    const errors = result.items.filter((item) => item.index?.error).length;
    if (errors > 0) {
      const firstError = result.items.find((item) => item.index?.error);
      this.logger.warn(
        `Bulk index: ${errors} errors. First: ${JSON.stringify(firstError?.index?.error)}`,
      );
    }

    return { errors, indexed: operations.length - errors };
  }

  /**
   * Delete all documents from an index (for reindexation).
   */
  async deleteByQuery(index: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index,
      query: { match_all: {} },
      refresh: true,
    });
  }

  /**
   * Cluster health check.
   */
  async clusterHealth(): Promise<{
    status: string;
    numberOfNodes: number;
    activePrimaryShards: number;
  }> {
    const result = await this.esClient.cluster.health();
    return {
      status: result.status,
      numberOfNodes: result.number_of_nodes,
      activePrimaryShards: result.active_primary_shards,
    };
  }

  /**
   * Ping the ES cluster. Returns true if reachable.
   */
  async ping(): Promise<boolean> {
    try {
      await this.esClient.ping();
      return true;
    } catch {
      return false;
    }
  }
}
