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
import { ProductionFormulasService } from './production-formulas.service';
import { CreateProductionFormulaDto, CreateFormulaIngredientDto } from './dto/create-production-formula.dto';
import { UpdateProductionFormulaDto } from './dto/update-production-formula.dto';
import {
  ProductionFormulaResponseDto,
  FormulaIngredientResponseDto,
} from './dto/production-formula-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Production Formulas')
@ApiBearerAuth()
@Controller('production-formulas')
export class ProductionFormulasController {
  constructor(
    private readonly productionFormulasService: ProductionFormulasService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Criar fórmula de produção' })
  @ApiResponse({ status: 201, type: ProductionFormulaResponseDto })
  create(@Body() dto: CreateProductionFormulaDto) {
    return this.productionFormulasService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar fórmulas de produção' })
  findAll(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    return this.productionFormulasService.findAll(pagination, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Buscar fórmula por ID (com ingredientes)' })
  @ApiResponse({ status: 200, type: ProductionFormulaResponseDto })
  @ApiResponse({ status: 404, description: 'Fórmula não encontrada' })
  findOne(@Param('id') id: string) {
    return this.productionFormulasService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar fórmula de produção' })
  @ApiResponse({ status: 200, type: ProductionFormulaResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductionFormulaDto) {
    return this.productionFormulasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover fórmula de produção (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.productionFormulasService.remove(id);
  }

  // --- Ingredients ---
  @Post(':id/ingredients')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Adicionar ingrediente à fórmula' })
  @ApiResponse({ status: 201, type: FormulaIngredientResponseDto })
  addIngredient(
    @Param('id') id: string,
    @Body() dto: CreateFormulaIngredientDto,
  ) {
    return this.productionFormulasService.addIngredient(id, dto);
  }

  @Patch(':id/ingredients/:ingredientId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Atualizar ingrediente da fórmula' })
  @ApiResponse({ status: 200, type: FormulaIngredientResponseDto })
  updateIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: Partial<CreateFormulaIngredientDto>,
  ) {
    return this.productionFormulasService.updateIngredient(id, ingredientId, dto);
  }

  @Delete(':id/ingredients/:ingredientId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover ingrediente da fórmula' })
  @ApiResponse({ status: 204 })
  removeIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
  ) {
    return this.productionFormulasService.removeIngredient(id, ingredientId);
  }
}
