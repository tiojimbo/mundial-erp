import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductTypeResponseDto } from './dto/product-type-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Product Types')
@ApiBearerAuth()
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar tipo de produto' })
  @ApiResponse({ status: 201, type: ProductTypeResponseDto })
  @ApiResponse({ status: 409, description: 'Prefixo já cadastrado' })
  create(@Body() dto: CreateProductTypeDto) {
    return this.productTypesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar tipos de produto' })
  findAll(@Query() pagination: PaginationDto) {
    return this.productTypesService.findAll(pagination);
  }

  @Get(':id/next-code')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Preview do próximo código disponível para o tipo',
    description:
      'Retorna o próximo código e EAN-13 que seriam gerados, sem reservá-los. ' +
      'O código só é efetivamente reservado ao criar o produto (POST /products). ' +
      'Dois requests simultâneos podem retornar o mesmo código.',
  })
  getNextCode(@Param('id') id: string) {
    return this.productTypesService.getNextCode(id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar tipo de produto por ID' })
  @ApiResponse({ status: 200, type: ProductTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Tipo de produto não encontrado' })
  findOne(@Param('id') id: string) {
    return this.productTypesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar tipo de produto' })
  @ApiResponse({ status: 200, type: ProductTypeResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductTypeDto) {
    return this.productTypesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover tipo de produto (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.productTypesService.remove(id);
  }
}
