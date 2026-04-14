import { Module } from '@nestjs/common';
import { ProductDepartmentsController } from './product-departments.controller';
import { ProductDepartmentsService } from './product-departments.service';
import { ProductDepartmentsRepository } from './product-departments.repository';

@Module({
  controllers: [ProductDepartmentsController],
  providers: [ProductDepartmentsService, ProductDepartmentsRepository],
  exports: [ProductDepartmentsService, ProductDepartmentsRepository],
})
export class ProductDepartmentsModule {}
