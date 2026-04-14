import { Module } from '@nestjs/common';
import { SuppliersRepository } from './suppliers.repository';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersRepository, SuppliersService],
  exports: [SuppliersService, SuppliersRepository],
})
export class SuppliersModule {}
