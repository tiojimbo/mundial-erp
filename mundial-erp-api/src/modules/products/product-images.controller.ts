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
import { WorkspaceMemberRole } from '@prisma/client';
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { WorkspaceRoles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Product Images')
@ApiBearerAuth()
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Adicionar imagem ao produto' })
  @ApiResponse({ status: 201, type: ProductImageResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productImagesService.create(workspaceId, productId, dto);
  }

  @Get()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Listar imagens do produto' })
  @ApiResponse({ status: 200, type: [ProductImageResponseDto] })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Param('productId') productId: string,
  ) {
    return this.productImagesService.findByProductId(workspaceId, productId);
  }

  @Patch('reorder')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Reordenar imagens do produto' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { imageIds: { type: 'array', items: { type: 'string' } } },
    },
  })
  @ApiResponse({ status: 200, type: [ProductImageResponseDto] })
  reorder(
    @WorkspaceId() workspaceId: string,
    @Param('productId') productId: string,
    @Body('imageIds') imageIds: string[],
  ) {
    return this.productImagesService.reorder(workspaceId, productId, imageIds);
  }

  @Delete(':imageId')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover imagem do produto' })
  @ApiResponse({ status: 204 })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImagesService.remove(workspaceId, productId, imageId);
  }
}
