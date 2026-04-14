import { Module } from '@nestjs/common';
import { CitiesRepository } from './cities.repository';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';

@Module({
  controllers: [CitiesController],
  providers: [CitiesRepository, CitiesService],
  exports: [CitiesService, CitiesRepository],
})
export class CitiesModule {}
