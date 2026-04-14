import { Module } from '@nestjs/common';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { DashboardsRepository } from './dashboards.repository';
import { DashboardCardQueryService } from './dashboard-card-query.service';

@Module({
  controllers: [DashboardsController],
  providers: [
    DashboardsRepository,
    DashboardsService,
    DashboardCardQueryService,
  ],
  exports: [DashboardsService, DashboardCardQueryService],
})
export class DashboardsModule {}
