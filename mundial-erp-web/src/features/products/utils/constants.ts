import type { ProductClassification, ProductStatus } from '../types/product.types';

export const CLASSIFICATION_LABELS: Record<ProductClassification, string> = {
  FABRICACAO_PROPRIA: 'Fabricação Própria',
  REVENDA: 'Revenda',
  MATERIA_PRIMA: 'Matéria Prima',
  INSUMO: 'Insumo',
};

export const CLASSIFICATION_COLORS: Record<
  ProductClassification,
  'blue' | 'purple' | 'orange' | 'green'
> = {
  FABRICACAO_PROPRIA: 'blue',
  REVENDA: 'purple',
  MATERIA_PRIMA: 'orange',
  INSUMO: 'green',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export const STATUS_COLORS: Record<ProductStatus, 'orange' | 'green' | 'red'> = {
  DRAFT: 'orange',
  ACTIVE: 'green',
  INACTIVE: 'red',
};

export const CLASSIFICATION_OPTIONS = [
  { value: 'FABRICACAO_PROPRIA', label: 'Fabricação Própria' },
  { value: 'REVENDA', label: 'Revenda' },
  { value: 'MATERIA_PRIMA', label: 'Matéria Prima' },
  { value: 'INSUMO', label: 'Insumo' },
] as const;
