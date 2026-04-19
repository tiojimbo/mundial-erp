import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductionFormulasRepository } from './production-formulas.repository';
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

@Injectable()
export class ProductionFormulasService {
  constructor(
    private readonly productionFormulasRepository: ProductionFormulasRepository,
  ) {}

  async create(
    dto: CreateProductionFormulaDto,
  ): Promise<ProductionFormulaResponseDto> {
    const createData: Prisma.ProductionFormulaCreateInput = {
      name: dto.name,
      yieldQuantity: dto.yieldQuantity,
      ...(dto.ingredients?.length && {
        ingredients: {
          create: dto.ingredients.map((ing) => ({
            ingredient: { connect: { id: ing.ingredientId } },
            quantity: ing.quantity,
            ...(ing.unitMeasureId && {
              unitMeasure: { connect: { id: ing.unitMeasureId } },
            }),
          })),
        },
      }),
    };

    const entity = await this.productionFormulasRepository.create(createData);
    return ProductionFormulaResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto, search?: string) {
    const { items, total } = await this.productionFormulasRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return {
      items: items.map(ProductionFormulaResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ProductionFormulaResponseDto> {
    const entity = await this.productionFormulasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fórmula de produção não encontrada');
    }
    return ProductionFormulaResponseDto.fromEntity(entity);
  }

  async findByProductId(
    productId: string,
  ): Promise<ProductionFormulaResponseDto> {
    const entity =
      await this.productionFormulasRepository.findByProductId(productId);
    if (!entity) {
      throw new NotFoundException('Fórmula não encontrada para este produto');
    }
    return ProductionFormulaResponseDto.fromEntity(entity);
  }

  async update(
    id: string,
    dto: UpdateProductionFormulaDto,
  ): Promise<ProductionFormulaResponseDto> {
    const entity = await this.productionFormulasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fórmula de produção não encontrada');
    }

    const updated = await this.productionFormulasRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.yieldQuantity !== undefined && {
        yieldQuantity: dto.yieldQuantity,
      }),
    });
    return ProductionFormulaResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.productionFormulasRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Fórmula de produção não encontrada');
    }
    await this.productionFormulasRepository.softDelete(id);
  }

  // --- Ingredients ---
  async addIngredient(
    formulaId: string,
    dto: CreateFormulaIngredientDto,
  ): Promise<FormulaIngredientResponseDto> {
    const formula = await this.productionFormulasRepository.findById(formulaId);
    if (!formula) {
      throw new NotFoundException('Fórmula de produção não encontrada');
    }

    const ingredient = await this.productionFormulasRepository.addIngredient({
      formula: { connect: { id: formulaId } },
      ingredient: { connect: { id: dto.ingredientId } },
      quantity: dto.quantity,
      ...(dto.unitMeasureId && {
        unitMeasure: { connect: { id: dto.unitMeasureId } },
      }),
    });
    return FormulaIngredientResponseDto.fromEntity(ingredient);
  }

  async updateIngredient(
    formulaId: string,
    ingredientId: string,
    dto: Partial<CreateFormulaIngredientDto>,
  ): Promise<FormulaIngredientResponseDto> {
    const existing =
      await this.productionFormulasRepository.findIngredientById(ingredientId);
    if (!existing || existing.formulaId !== formulaId) {
      throw new NotFoundException('Ingrediente não encontrado nesta fórmula');
    }

    const updated = await this.productionFormulasRepository.updateIngredient(
      ingredientId,
      {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.ingredientId && {
          ingredient: { connect: { id: dto.ingredientId } },
        }),
        ...(dto.unitMeasureId !== undefined && {
          unitMeasure: dto.unitMeasureId
            ? { connect: { id: dto.unitMeasureId } }
            : { disconnect: true },
        }),
      },
    );
    return FormulaIngredientResponseDto.fromEntity(updated);
  }

  async removeIngredient(
    formulaId: string,
    ingredientId: string,
  ): Promise<void> {
    const existing =
      await this.productionFormulasRepository.findIngredientById(ingredientId);
    if (!existing || existing.formulaId !== formulaId) {
      throw new NotFoundException('Ingrediente não encontrado nesta fórmula');
    }
    await this.productionFormulasRepository.removeIngredient(ingredientId);
  }
}
