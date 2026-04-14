import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';
import { ProductImagesRepository } from './product-images.repository';
import { ProductionFormulasModule } from '../production-formulas/production-formulas.module';

@Module({
  imports: [ProductionFormulasModule],
  controllers: [ProductsController, ProductImagesController],
  providers: [
    ProductsService,
    ProductsRepository,
    ProductImagesService,
    ProductImagesRepository,
  ],
  exports: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
