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
import { WorkspaceMemberRole } from '@prisma/client';
import { ProductionFormulasService } from './production-formulas.service';
import {
  CreateProductionFormulaDto,
  CreateFormulaIngredientDto,
} from './dto/create-production-formula.dto';
import { UpdateProductionFormulaDto } from './dto/update-production-formula.dto';
import {
  ProductionFormulaResponseDto,
  FormulaIngredientResponseDto,
} from './dto/production-formula-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../auth/decorators';

@ApiTags('Production Formulas')
@ApiBearerAuth()
@Controller('production-formulas')
export class ProductionFormulasController {
  constructor(
    private readonly productionFormulasService: ProductionFormulasService,
  ) {}

  @Post()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Criar fórmula de produção' })
  @ApiResponse({ status: 201, type: ProductionFormulaResponseDto })
  create(@Body() dto: CreateProductionFormulaDto) {
    return this.productionFormulasService.create(dto);
  }

  @Get()
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Listar fórmulas de produção' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.productionFormulasService.findAll(pagination, search);
  }

  @Get(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Buscar fórmula por ID (com ingredientes)' })
  @ApiResponse({ status: 200, type: ProductionFormulaResponseDto })
  @ApiResponse({ status: 404, description: 'Fórmula não encontrada' })
  findOne(@Param('id') id: string) {
    return this.productionFormulasService.findById(id);
  }

  @Patch(':id')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Atualizar fórmula de produção' })
  @ApiResponse({ status: 200, type: ProductionFormulaResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductionFormulaDto) {
    return this.productionFormulasService.update(id, dto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover fórmula de produção (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.productionFormulasService.remove(id);
  }

  // --- Ingredients ---
  @Post(':id/ingredients')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Adicionar ingrediente à fórmula' })
  @ApiResponse({ status: 201, type: FormulaIngredientResponseDto })
  addIngredient(
    @Param('id') id: string,
    @Body() dto: CreateFormulaIngredientDto,
  ) {
    return this.productionFormulasService.addIngredient(id, dto);
  }

  @Patch(':id/ingredients/:ingredientId')
  @WorkspaceRoles(
    WorkspaceMemberRole.OWNER,
    WorkspaceMemberRole.ADMIN,
    WorkspaceMemberRole.EDITOR,
  )
  @ApiOperation({ summary: 'Atualizar ingrediente da fórmula' })
  @ApiResponse({ status: 200, type: FormulaIngredientResponseDto })
  updateIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: Partial<CreateFormulaIngredientDto>,
  ) {
    return this.productionFormulasService.updateIngredient(
      id,
      ingredientId,
      dto,
    );
  }

  @Delete(':id/ingredients/:ingredientId')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
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
