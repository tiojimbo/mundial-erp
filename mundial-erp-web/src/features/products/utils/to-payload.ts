import type { ProductFormData } from '../schemas/product.schema';
import type {
  CreateProductPayload,
  UpdateProductPayload,
} from '../types/product.types';

export function toProductPayload(data: ProductFormData): CreateProductPayload {
  return {
    productTypeId: data.productTypeId,
    ...buildSharedFields(data),
  };
}

export function toUpdateProductPayload(
  data: ProductFormData,
): UpdateProductPayload {
  return buildSharedFields(data);
}

function buildSharedFields(
  data: ProductFormData,
): Omit<CreateProductPayload, 'productTypeId'> {
  return {
    // Step 1
    name: data.name,
    departmentCategoryId: data.departmentCategoryId,
    brandId: data.brandId,
    unitMeasureId: data.unitMeasureId,
    boxUnitMeasureId: data.boxUnitMeasureId || undefined,
    unitsPerBox:
      typeof data.unitsPerBox === 'number' ? data.unitsPerBox : undefined,
    // Step 2
    weight: data.weight,
    width: data.width,
    height: data.height,
    length: data.length,
    weightM3: typeof data.weightM3 === 'number' ? data.weightM3 : undefined,
    productionCapacity:
      typeof data.productionCapacity === 'number'
        ? data.productionCapacity
        : undefined,
    stockLocation: data.stockLocation || undefined,
    minStock: data.minStock,
    piecesPerUnit:
      typeof data.piecesPerUnit === 'number' ? data.piecesPerUnit : undefined,
    size: typeof data.size === 'number' ? data.size : undefined,
    classification: data.classification,
    loadCapacity:
      typeof data.loadCapacity === 'number' ? data.loadCapacity : undefined,
    beta: typeof data.beta === 'number' ? data.beta : undefined,
    fckMpa: typeof data.fckMpa === 'number' ? data.fckMpa : undefined,
    // Step 3
    ncmCode: data.ncmCode,
    nfeOriginId: data.nfeOriginId || undefined,
    cfopDefault: data.cfopDefault || undefined,
    ipiRate: typeof data.ipiRate === 'number' ? data.ipiRate : undefined,
    taxBasketId: data.taxBasketId || undefined,
    // Step 4
    costPrice: data.costPrice,
    salePrice: data.salePrice,
    minSalePrice: data.minSalePrice,
    defaultPriceTableId: data.defaultPriceTableId || undefined,
  };
}
