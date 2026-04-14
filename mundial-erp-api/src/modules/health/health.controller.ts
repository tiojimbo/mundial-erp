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
  @ApiOperation({ summary: 'Readiness check (DB + Redis + Elasticsearch)' })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.redisHealth.isHealthy('redis'),
      () => this.searchHealth.isHealthy('elasticsearch'),
    ]);
  }
}
