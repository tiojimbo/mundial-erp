import { Module } from '@nestjs/common';
import { ProductTypesController } from './product-types.controller';
import { ProductTypesService } from './product-types.service';
import { ProductTypesRepository } from './product-types.repository';

@Module({
  controllers: [ProductTypesController],
  providers: [ProductTypesService, ProductTypesRepository],
  exports: [ProductTypesService, ProductTypesRepository],
})
export class ProductTypesModule {}
