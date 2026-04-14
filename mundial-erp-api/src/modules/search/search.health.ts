import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './search.constants';

@Injectable()
export class SearchHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(ELASTICSEARCH_CLIENT) private readonly esClient: Client,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.esClient.cluster.health();
      const isUp = health.status !== 'red';
      const result = this.getStatus(key, isUp, {
        status: health.status,
      });
      if (isUp) return result;
      throw new HealthCheckError('Elasticsearch cluster is red', result);
    } catch (error) {
      if (error instanceof HealthCheckError) throw error;
      throw new HealthCheckError(
        'Elasticsearch check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
