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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Product Images')
@ApiBearerAuth()
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar imagem ao produto' })
  @ApiResponse({ status: 201, type: ProductImageResponseDto })
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productImagesService.create(productId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar imagens do produto' })
  @ApiResponse({ status: 200, type: [ProductImageResponseDto] })
  findAll(@Param('productId') productId: string) {
    return this.productImagesService.findByProductId(productId);
  }

  @Patch('reorder')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Reordenar imagens do produto' })
  @ApiBody({ schema: { type: 'object', properties: { imageIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, type: [ProductImageResponseDto] })
  reorder(
    @Param('productId') productId: string,
    @Body('imageIds') imageIds: string[],
  ) {
    return this.productImagesService.reorder(productId, imageIds);
  }

  @Delete(':imageId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover imagem do produto' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.remove(productId, imageId);
  }
}
