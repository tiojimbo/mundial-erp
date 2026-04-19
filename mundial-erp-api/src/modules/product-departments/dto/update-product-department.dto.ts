import { PartialType } from '@nestjs/swagger';
import { CreateProductDepartmentDto } from './create-product-department.dto';

export class UpdateProductDepartmentDto extends PartialType(
  CreateProductDepartmentDto,
) {}
