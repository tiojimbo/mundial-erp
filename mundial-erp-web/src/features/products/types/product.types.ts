export type ProductClassification =
  | 'FABRICACAO_PROPRIA'
  | 'REVENDA'
  | 'MATERIA_PRIMA'
  | 'INSUMO';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export type ProductType = {
  id: string;
  prefix: string;
  name: string;
  eanDeptCode: string;
  lastSequential: number;
};

export type UnitMeasure = {
  id: string;
  name: string;
  proFinancasId: number | null;
};

export type Brand = {
  id: string;
  name: string;
  proFinancasId: number | null;
};

export type ProductDepartment = {
  id: string;
  name: string;
  proFinancasId: number | null;
};

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
};

export type ProductFormula = {
  id: string;
  productId: string;
  name: string;
  yieldQuantity: number;
  ingredients: ProductFormulaIngredient[];
};

export type ProductFormulaIngredient = {
  id: string;
  formulaId: string;
  ingredientId: string;
  ingredient?: Product;
  quantity: number;
  unitMeasureId: string;
  unitMeasure?: UnitMeasure;
};

export type StockMovement = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reference: string | null;
  createdAt: string;
};

export type Product = {
  id: string;
  // Step 1 - Identification
  productTypeId: string;
  productType: ProductType | null;
  code: string;
  barcode: string;
  name: string;
  departmentCategoryId: string;
  departmentCategory: ProductDepartment | null;
  brandId: string;
  brand: Brand | null;
  unitMeasureId: string;
  unitMeasure: UnitMeasure | null;
  boxUnitMeasureId: string | null;
  boxUnitMeasure: UnitMeasure | null;
  unitsPerBox: number | null;
  step1Complete: boolean;
  // Step 2 - Technical Specification
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  weightM3: number | null;
  productionCapacity: number | null;
  stockLocation: string | null;
  minStock: number | null;
  currentStock: number;
  piecesPerUnit: number | null;
  size: number | null;
  classification: ProductClassification | null;
  loadCapacity: number | null;
  beta: number | null;
  fckMpa: number | null;
  step2Complete: boolean;
  // Step 3 - Fiscal
  ncmCode: string | null;
  nfeOriginId: string | null;
  cfopDefault: string | null;
  ipiRate: number | null;
  taxBasketId: string | null;
  step3Complete: boolean;
  // Step 4 - Pricing
  costPrice: number | null;
  salePrice: number | null;
  minSalePrice: number | null;
  defaultPriceTableId: string | null;
  formulaId: string | null;
  step4Complete: boolean;
  // Status & control
  status: ProductStatus;
  proFinancasId: number | null;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
};

export type CreateProductPayload = {
  // Step 1
  productTypeId: string;
  name: string;
  departmentCategoryId: string;
  brandId: string;
  unitMeasureId: string;
  boxUnitMeasureId?: string;
  unitsPerBox?: number;
  // Step 2
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  weightM3?: number;
  productionCapacity?: number;
  stockLocation?: string;
  minStock?: number;
  piecesPerUnit?: number;
  size?: number;
  classification?: ProductClassification;
  loadCapacity?: number;
  beta?: number;
  fckMpa?: number;
  // Step 3
  ncmCode?: string;
  nfeOriginId?: string;
  cfopDefault?: string;
  ipiRate?: number;
  taxBasketId?: string;
  // Step 4
  costPrice?: number;
  salePrice?: number;
  minSalePrice?: number;
  defaultPriceTableId?: string;
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

export type ProductFilters = {
  page?: number;
  limit?: number;
  search?: string;
  classification?: ProductClassification;
  departmentCategoryId?: string;
  status?: ProductStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
