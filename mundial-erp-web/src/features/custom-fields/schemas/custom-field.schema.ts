import { z } from 'zod';
import type { CustomFieldDefinition } from '../types/custom-field.types';

/**
 * Schemas Zod por tipo de custom field.
 *
 * `schemaForField(definition)` despacha pelo `type` da definition e respeita
 * `required` + `config` + `options`. Backend e fonte de verdade — se
 * divergir, UI reflete 422.
 */

export const textSchema = z.string().max(2000);

export const numberSchema = (min?: number, max?: number) => {
  let schema = z.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return schema;
};

export const currencySchema = z.number().min(0).multipleOf(0.01);

export const dateSchema = z.string().datetime().or(z.date());

export const dropdownSchema = (options: string[]) =>
  z.enum(options as [string, ...string[]]);

export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF invalido');

export const cnpjSchema = z
  .string()
  .regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ invalido');

export const urlSchema = z.string().url();

export const emailSchema = z.string().email().max(320);

export const phoneSchema = z
  .string()
  .regex(/^(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4,5}-?\d{4}$/, 'Telefone invalido');

export const checkboxSchema = z.boolean();

export const percentageSchema = (min = 0, max = 100) =>
  z.number().min(min).max(max);

export const durationSchema = z.number().int().min(0);

export const ratingSchema = (maxStars = 5) =>
  z.number().int().min(0).max(maxStars);

const ID_REGEX = /^[0-9a-zA-Z_-]{8,64}$/;

export const idSchema = z.string().regex(ID_REGEX, 'ID invalido');

export const idArraySchema = z.array(idSchema);

function uniqueIds(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}

function extractStringOptions(d: CustomFieldDefinition): string[] {
  if (Array.isArray(d.options) && d.options.length > 0) {
    const flat = d.options
      .map((opt) => {
        if (typeof opt === 'string') return opt;
        if (
          typeof opt === 'object' &&
          opt !== null &&
          typeof (opt as { value?: unknown }).value === 'string'
        ) {
          return (opt as { value: string }).value;
        }
        return null;
      })
      .filter((v): v is string => v !== null);
    if (flat.length > 0) return flat;
  }
  return (d.config?.options ?? []).map((opt) => opt.value);
}

export function schemaForField(d: CustomFieldDefinition): z.ZodTypeAny {
  switch (d.type) {
    case 'TEXT':
      return d.required
        ? textSchema.min(1, 'Campo obrigatorio')
        : textSchema.optional();

    case 'NUMBER': {
      const schema = numberSchema(d.config?.min, d.config?.max);
      return d.required ? schema : schema.optional();
    }

    case 'CURRENCY':
      return d.required ? currencySchema : currencySchema.optional();

    case 'DATE':
      return d.required ? dateSchema : dateSchema.optional();

    case 'DROPDOWN':
    case 'SELECT':
    case 'LABEL': {
      const options = extractStringOptions(d);
      if (options.length === 0) {
        return d.required ? z.never() : z.never().optional();
      }
      const schema = dropdownSchema(options);
      return d.required ? schema : schema.optional();
    }

    case 'CPF':
      return d.required ? cpfSchema : cpfSchema.optional();

    case 'CNPJ':
      return d.required ? cnpjSchema : cnpjSchema.optional();

    case 'URL':
      return d.required ? urlSchema : urlSchema.optional();

    case 'EMAIL':
      return d.required ? emailSchema : emailSchema.optional();

    case 'PHONE':
      return d.required ? phoneSchema : phoneSchema.optional();

    case 'CHECKBOX':
      return d.required ? checkboxSchema : checkboxSchema.optional();

    case 'PERCENTAGE': {
      const schema = percentageSchema(d.config?.min, d.config?.max);
      return d.required ? schema : schema.optional();
    }

    case 'DURATION':
      return d.required ? durationSchema : durationSchema.optional();

    case 'RATING': {
      const schema = ratingSchema(d.config?.maxStars);
      return d.required ? schema : schema.optional();
    }

    case 'USER':
    case 'TEAM':
      return d.required ? idSchema : idSchema.optional();

    case 'PEOPLE':
    case 'RELATIONSHIP': {
      const base = idArraySchema.refine(uniqueIds, 'IDs duplicados');
      if (d.required) {
        return base.refine(
          (arr) => arr.length > 0,
          'Selecione ao menos um item',
        );
      }
      return base.optional();
    }

    case 'ROLLUP':
      // Readonly do lado do cliente — sem validacao de input.
      return z.any().optional();
  }
}
