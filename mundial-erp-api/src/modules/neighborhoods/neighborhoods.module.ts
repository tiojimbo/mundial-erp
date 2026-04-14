import { Module } from '@nestjs/common';
import { NeighborhoodsRepository } from './neighborhoods.repository';
import { NeighborhoodsService } from './neighborhoods.service';
import { NeighborhoodsController } from './neighborhoods.controller';

@Module({
  controllers: [NeighborhoodsController],
  providers: [NeighborhoodsRepository, NeighborhoodsService],
  exports: [NeighborhoodsService],
})
export class NeighborhoodsModule {}
