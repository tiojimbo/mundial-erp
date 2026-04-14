import { z } from 'zod';

// Step 1 — Identification
export const step1Schema = z.object({
  productTypeId: z.string().min(1, 'Tipo de produto é obrigatório'),
  name: z
    .string()
    .min(3, 'Descrição deve ter no mínimo 3 caracteres')
    .max(255, 'Descrição deve ter no máximo 255 caracteres'),
  departmentCategoryId: z.string().min(1, 'Departamento é obrigatório'),
  brandId: z.string().min(1, 'Marca é obrigatória'),
  unitMeasureId: z.string().min(1, 'Unidade de medida é obrigatória'),
  boxUnitMeasureId: z.string().optional().or(z.literal('')),
  unitsPerBox: z.coerce.number().int().positive().optional().or(z.literal('')),
});

// Step 2 — Technical Specification
export const step2Schema = z
  .object({
    weight: z.coerce.number().positive('Peso é obrigatório'),
    width: z.coerce.number().positive('Largura é obrigatória'),
    height: z.coerce.number().positive('Altura é obrigatória'),
    length: z.coerce.number().positive('Comprimento é obrigatório'),
    weightM3: z.coerce.number().positive().optional().or(z.literal('')),
    productionCapacity: z.coerce.number().positive().optional().or(z.literal('')),
    stockLocation: z.string().max(100).optional().or(z.literal('')),
    minStock: z.coerce.number().min(0, 'Estoque mínimo inválido'),
    piecesPerUnit: z.coerce.number().positive().optional().or(z.literal('')),
    size: z.coerce.number().positive().optional().or(z.literal('')),
    classification: z.enum(
      ['FABRICACAO_PROPRIA', 'REVENDA', 'MATERIA_PRIMA', 'INSUMO'],
      { required_error: 'Classificação é obrigatória' },
    ),
    loadCapacity: z.coerce.number().positive().optional().or(z.literal('')),
    beta: z.coerce.number().optional().or(z.literal('')),
    fckMpa: z.coerce.number().positive().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (
      (data.classification === 'FABRICACAO_PROPRIA' ||
        data.classification === 'MATERIA_PRIMA') &&
      (!data.minStock || data.minStock <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Estoque mínimo deve ser maior que 0 para Fabricação Própria e Matéria Prima',
        path: ['minStock'],
      });
    }
  });

// Step 3 — Fiscal
export const step3Schema = z.object({
  ncmCode: z
    .string()
    .min(1, 'NCM é obrigatório')
    .max(10, 'NCM deve ter no máximo 10 caracteres'),
  nfeOriginId: z.string().optional().or(z.literal('')),
  cfopDefault: z.string().optional().or(z.literal('')),
  ipiRate: z.coerce.number().min(0).optional().or(z.literal('')),
  taxBasketId: z.string().optional().or(z.literal('')),
});

// Step 4 — Pricing
export const step4Schema = z.object({
  costPrice: z.coerce.number().min(0, 'Preço de custo inválido'),
  salePrice: z.coerce.number().positive('Preço de venda é obrigatório'),
  minSalePrice: z.coerce.number().min(0, 'Preço mínimo inválido'),
  defaultPriceTableId: z.string().optional().or(z.literal('')),
});

// Schema base do step 2 (sem superRefine) para merge
const step2Base = z.object({
  weight: z.coerce.number().positive('Peso é obrigatório'),
  width: z.coerce.number().positive('Largura é obrigatória'),
  height: z.coerce.number().positive('Altura é obrigatória'),
  length: z.coerce.number().positive('Comprimento é obrigatório'),
  weightM3: z.coerce.number().positive().optional().or(z.literal('')),
  productionCapacity: z.coerce.number().positive().optional().or(z.literal('')),
  stockLocation: z.string().max(100).optional().or(z.literal('')),
  minStock: z.coerce.number().min(0, 'Estoque mínimo inválido'),
  piecesPerUnit: z.coerce.number().positive().optional().or(z.literal('')),
  size: z.coerce.number().positive().optional().or(z.literal('')),
  classification: z.enum(
    ['FABRICACAO_PROPRIA', 'REVENDA', 'MATERIA_PRIMA', 'INSUMO'],
    { required_error: 'Classificação é obrigatória' },
  ),
  loadCapacity: z.coerce.number().positive().optional().or(z.literal('')),
  beta: z.coerce.number().optional().or(z.literal('')),
  fckMpa: z.coerce.number().positive().optional().or(z.literal('')),
});

export const productSchema = step1Schema
  .merge(step2Base)
  .merge(step3Schema)
  .merge(step4Schema)
  .superRefine((data, ctx) => {
    if (
      (data.classification === 'FABRICACAO_PROPRIA' ||
        data.classification === 'MATERIA_PRIMA') &&
      (!data.minStock || data.minStock <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Estoque mínimo deve ser maior que 0 para Fabricação Própria e Matéria Prima',
        path: ['minStock'],
      });
    }
  });

export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type Step3FormData = z.infer<typeof step3Schema>;
export type Step4FormData = z.infer<typeof step4Schema>;
export type ProductFormData = z.infer<typeof productSchema>;
