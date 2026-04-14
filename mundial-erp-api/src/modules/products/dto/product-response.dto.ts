import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductClassification, ProductStatus } from '@prisma/client';
import type {
  Product,
  ProductType,
  ProductDepartment,
  Brand,
  UnitMeasure,
  PriceTable,
  ProductImage,
  ProductionFormula,
} from '@prisma/client';

type ProductWithRelations = Product & {
  productType?: ProductType;
  departmentCategory?: ProductDepartment | null;
  brand?: Brand | null;
  unitMeasure?: UnitMeasure | null;
  boxUnitMeasure?: UnitMeasure | null;
  defaultPriceTable?: PriceTable | null;
  formula?: (ProductionFormula & { ingredients?: unknown[] }) | null;
  images?: ProductImage[];
};

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  // Step 1
  @ApiProperty()
  productTypeId: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  barcode: string | null;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  departmentCategoryId: string | null;

  @ApiPropertyOptional()
  brandId: string | null;

  @ApiPropertyOptional()
  unitMeasureId: string | null;

  @ApiPropertyOptional()
  boxUnitMeasureId: string | null;

  @ApiPropertyOptional()
  unitsPerBox: number | null;

  @ApiProperty()
  step1Complete: boolean;

  // Step 2
  @ApiPropertyOptional()
  weight: number | null;

  @ApiPropertyOptional()
  width: number | null;

  @ApiPropertyOptional()
  height: number | null;

  @ApiPropertyOptional()
  length: number | null;

  @ApiPropertyOptional()
  weightM3: number | null;

  @ApiPropertyOptional()
  productionCapacity: number | null;

  @ApiPropertyOptional()
  stockLocation: string | null;

  @ApiProperty()
  minStock: number;

  @ApiProperty()
  currentStock: number;

  @ApiPropertyOptional()
  piecesPerUnit: number | null;

  @ApiPropertyOptional()
  size: number | null;

  @ApiPropertyOptional({ enum: ProductClassification })
  classification: ProductClassification | null;

  @ApiPropertyOptional()
  loadCapacity: number | null;

  @ApiPropertyOptional()
  beta: number | null;

  @ApiPropertyOptional()
  fckMpa: number | null;

  @ApiProperty()
  step2Complete: boolean;

  // Step 3
  @ApiPropertyOptional()
  ncmCode: string | null;

  @ApiPropertyOptional()
  nfeOriginId: string | null;

  @ApiPropertyOptional()
  cfopDefault: string | null;

  @ApiPropertyOptional()
  ipiRate: number | null;

  @ApiPropertyOptional()
  taxBasketId: string | null;

  @ApiProperty()
  step3Complete: boolean;

  // Step 4
  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  salePrice: number;

  @ApiProperty()
  minSalePrice: number;

  @ApiPropertyOptional()
  defaultPriceTableId: string | null;

  @ApiPropertyOptional()
  formulaId: string | null;

  @ApiProperty()
  step4Complete: boolean;

  // Status
  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Relations (populated when included)
  @ApiPropertyOptional()
  productType?: Record<string, unknown>;

  @ApiPropertyOptional()
  departmentCategory?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  brand?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  unitMeasure?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  boxUnitMeasure?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  defaultPriceTable?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  formula?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  images?: Record<string, unknown>[];

  static fromEntity(entity: ProductWithRelations): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = entity.id;
    // Step 1
    dto.productTypeId = entity.productTypeId;
    dto.code = entity.code;
    dto.barcode = entity.barcode;
    dto.name = entity.name;
    dto.departmentCategoryId = entity.departmentCategoryId;
    dto.brandId = entity.brandId;
    dto.unitMeasureId = entity.unitMeasureId;
    dto.boxUnitMeasureId = entity.boxUnitMeasureId;
    dto.unitsPerBox = entity.unitsPerBox;
    dto.step1Complete = entity.step1Complete;
    // Step 2
    dto.weight = entity.weight;
    dto.width = entity.width;
    dto.height = entity.height;
    dto.length = entity.length;
    dto.weightM3 = entity.weightM3;
    dto.productionCapacity = entity.productionCapacity;
    dto.stockLocation = entity.stockLocation;
    dto.minStock = entity.minStock;
    dto.currentStock = entity.currentStock;
    dto.piecesPerUnit = entity.piecesPerUnit;
    dto.size = entity.size;
    dto.classification = entity.classification;
    dto.loadCapacity = entity.loadCapacity;
    dto.beta = entity.beta;
    dto.fckMpa = entity.fckMpa;
    dto.step2Complete = entity.step2Complete;
    // Step 3
    dto.ncmCode = entity.ncmCode;
    dto.nfeOriginId = entity.nfeOriginId;
    dto.cfopDefault = entity.cfopDefault;
    dto.ipiRate = entity.ipiRate;
    dto.taxBasketId = entity.taxBasketId;
    dto.step3Complete = entity.step3Complete;
    // Step 4
    dto.costPrice = entity.costPrice;
    dto.salePrice = entity.salePrice;
    dto.minSalePrice = entity.minSalePrice;
    dto.defaultPriceTableId = entity.defaultPriceTableId;
    dto.formulaId = entity.formulaId;
    dto.step4Complete = entity.step4Complete;
    // Status
    dto.status = entity.status;
    dto.proFinancasId = entity.proFinancasId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    // Relations
    if (entity.productType) dto.productType = entity.productType;
    if (entity.departmentCategory) dto.departmentCategory = entity.departmentCategory;
    if (entity.brand) dto.brand = entity.brand;
    if (entity.unitMeasure) dto.unitMeasure = entity.unitMeasure;
    if (entity.boxUnitMeasure) dto.boxUnitMeasure = entity.boxUnitMeasure;
    if (entity.defaultPriceTable) dto.defaultPriceTable = entity.defaultPriceTable;
    if (entity.formula) dto.formula = entity.formula;
    if (entity.images) dto.images = entity.images;
    return dto;
  }
}
