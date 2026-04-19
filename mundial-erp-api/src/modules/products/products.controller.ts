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
import { ProductsService } from './products.service';
import { ProductionFormulasService } from '../production-formulas/production-formulas.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductionFormulaResponseDto } from '../production-formulas/dto/production-formula-response.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productionFormulasService: ProductionFormulasService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Criar produto (inicia Etapa 1)',
    description:
      'Cria produto com código e EAN-13 gerados automaticamente. ' +
      'O produto inicia com status DRAFT.',
  })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar produtos com filtros' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.productsService.findAll(workspaceId, query, {
      search: query.search,
      status: query.status,
      classification: query.classification,
      productTypeId: query.productTypeId,
      brandId: query.brandId,
      departmentCategoryId: query.departmentCategoryId,
    });
  }

  @Get('barcode/:ean')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Buscar produto por EAN-13',
    description: 'Endpoint para leitor de código de barras',
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  findByBarcode(@WorkspaceId() workspaceId: string, @Param('ean') ean: string) {
    return this.productsService.findByBarcode(workspaceId, ean);
  }

  @Get(':id/formula')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Buscar fórmula de produção do produto (aba inline)',
  })
  @ApiResponse({ status: 200, type: ProductionFormulaResponseDto })
  @ApiResponse({ status: 404, description: 'Fórmula não encontrada' })
  findFormula(@Param('id') id: string) {
    return this.productionFormulasService.findByProductId(id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Buscar produto por ID (dossiê com todas as 4 etapas)',
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.productsService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Atualizar produto (avançar etapas do wizard)',
    description:
      'Atualiza campos do produto. As flags stepXComplete são calculadas automaticamente. ' +
      'Quando todas as 4 etapas estiverem completas, o status muda de DRAFT para ACTIVE.',
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(workspaceId, id, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Ativar produto manualmente',
    description: 'Requer todas as 4 etapas completas.',
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  activate(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.productsService.activate(workspaceId, id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Desativar produto' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  deactivate(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.productsService.deactivate(workspaceId, id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover produto (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.productsService.remove(workspaceId, id);
  }
}
