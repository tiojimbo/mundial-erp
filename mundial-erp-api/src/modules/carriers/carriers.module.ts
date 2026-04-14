import { Module } from '@nestjs/common';
import { CarriersController } from './carriers.controller';
import { CarriersService } from './carriers.service';
import { CarriersRepository } from './carriers.repository';

@Module({
  controllers: [CarriersController],
  providers: [CarriersService, CarriersRepository],
  exports: [CarriersService, CarriersRepository],
})
export class CarriersModule {}
