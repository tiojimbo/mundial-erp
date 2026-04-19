import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';
import { SearchHealthIndicator } from '../search/search.health';
import { RedisHealthIndicator } from './redis.health';
import { Public } from '../auth/decorators';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    private redisHealth: RedisHealthIndicator,
    private searchHealth: SearchHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic liveness check' })
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check (DB required, Redis + ES optional)',
  })
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Database is required — fails readiness if down
      () => this.prismaHealth.pingCheck('database', this.prisma),
      // Redis and Elasticsearch are optional — report status but don't fail readiness
      async () => {
        try {
          return await this.redisHealth.isHealthy('redis');
        } catch {
          return { redis: { status: 'down' as const } };
        }
      },
      async () => {
        try {
          return await this.searchHealth.isHealthy('elasticsearch');
        } catch {
          return { elasticsearch: { status: 'down' as const } };
        }
      },
    ]);
  }
}
