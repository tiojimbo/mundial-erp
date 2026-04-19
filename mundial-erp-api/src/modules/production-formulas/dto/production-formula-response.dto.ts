import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  Product,
  ProductionFormula,
  ProductionFormulaIngredient,
  UnitMeasure,
} from '@prisma/client';

type IngredientWithRelations = ProductionFormulaIngredient & {
  ingredient?: Product;
  unitMeasure?: UnitMeasure | null;
};

type FormulaWithRelations = ProductionFormula & {
  product?: Product | null;
  ingredients?: IngredientWithRelations[];
};

export class FormulaIngredientResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  formulaId: string;

  @ApiProperty()
  ingredientId: string;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional()
  unitMeasureId: string | null;

  @ApiPropertyOptional()
  ingredient?: Record<string, unknown>;

  @ApiPropertyOptional()
  unitMeasure?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: IngredientWithRelations,
  ): FormulaIngredientResponseDto {
    const dto = new FormulaIngredientResponseDto();
    dto.id = entity.id;
    dto.formulaId = entity.formulaId;
    dto.ingredientId = entity.ingredientId;
    dto.quantity = entity.quantity;
    dto.unitMeasureId = entity.unitMeasureId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (entity.ingredient) dto.ingredient = entity.ingredient;
    if (entity.unitMeasure) dto.unitMeasure = entity.unitMeasure;
    return dto;
  }
}

export class ProductionFormulaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  yieldQuantity: number;

  @ApiPropertyOptional()
  product?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [FormulaIngredientResponseDto] })
  ingredients?: FormulaIngredientResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: FormulaWithRelations,
  ): ProductionFormulaResponseDto {
    const dto = new ProductionFormulaResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.yieldQuantity = entity.yieldQuantity;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    if (entity.product) dto.product = entity.product;
    if (entity.ingredients) {
      dto.ingredients = entity.ingredients.map(
        FormulaIngredientResponseDto.fromEntity,
      );
    }
    return dto;
  }
}
