import { Module } from '@nestjs/common';
import { StatesRepository } from './states.repository';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';

@Module({
  controllers: [StatesController],
  providers: [StatesRepository, StatesService],
  exports: [StatesService, StatesRepository],
})
export class StatesModule {}
