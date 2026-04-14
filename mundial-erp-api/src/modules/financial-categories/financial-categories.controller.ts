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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FinancialCategoriesService } from './financial-categories.service';
import { CreateFinancialCategoryDto } from './dto/create-financial-category.dto';
import { UpdateFinancialCategoryDto } from './dto/update-financial-category.dto';
import { FinancialCategoryResponseDto } from './dto/financial-category-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Financial Categories')
@ApiBearerAuth()
@Controller('financial-categories')
export class FinancialCategoriesController {
  constructor(private readonly financialCategoriesService: FinancialCategoriesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar categoria financeira' })
  @ApiResponse({ status: 201, type: FinancialCategoryResponseDto })
  create(@Body() dto: CreateFinancialCategoryDto) {
    return this.financialCategoriesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  @ApiQuery({ name: 'search', required: false, description: 'Filtrar por nome' })
  @ApiQuery({ name: 'type', required: false, enum: ['RECEITA', 'DESPESA'], description: 'Filtrar por tipo' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.financialCategoriesService.findAll(pagination, search, type);
  }

  @Get('roots')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar categorias raiz com subcategorias (árvore hierárquica)' })
  findRoots(@Query() pagination: PaginationDto) {
    return this.financialCategoriesService.findRoots(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar categoria financeira por ID' })
  @ApiResponse({ status: 200, type: FinancialCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria financeira não encontrada' })
  findOne(@Param('id') id: string) {
    return this.financialCategoriesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar categoria financeira' })
  @ApiResponse({ status: 200, type: FinancialCategoryResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateFinancialCategoryDto) {
    return this.financialCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover categoria financeira (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.financialCategoriesService.remove(id);
  }
}
