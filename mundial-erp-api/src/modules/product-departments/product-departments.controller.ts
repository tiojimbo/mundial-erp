import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductDepartmentsService } from './product-departments.service';
import { CreateProductDepartmentDto } from './dto/create-product-department.dto';
import { UpdateProductDepartmentDto } from './dto/update-product-department.dto';
import { ProductDepartmentResponseDto } from './dto/product-department-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Product Departments')
@ApiBearerAuth()
@Controller('product-departments')
export class ProductDepartmentsController {
  constructor(private readonly productDepartmentsService: ProductDepartmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar departamento de produto' })
  @ApiResponse({ status: 201, type: ProductDepartmentResponseDto })
  @ApiResponse({ status: 409, description: 'Departamento já cadastrado' })
  create(@Body() dto: CreateProductDepartmentDto) {
    return this.productDepartmentsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar departamentos de produto' })
  findAll(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.productDepartmentsService.findAll(pagination, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar departamento por ID' })
  @ApiResponse({ status: 200, type: ProductDepartmentResponseDto })
  @ApiResponse({ status: 404, description: 'Não encontrado' })
  findOne(@Param('id') id: string) {
    return this.productDepartmentsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar departamento de produto' })
  @ApiResponse({ status: 200, type: ProductDepartmentResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductDepartmentDto) {
    return this.productDepartmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover departamento de produto (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.productDepartmentsService.remove(id);
  }
}
