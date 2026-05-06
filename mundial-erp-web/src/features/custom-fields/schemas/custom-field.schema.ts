import { z } from 'zod';
import type { CustomFieldDefinition } from '../types/custom-field.types';

/**
 * Schemas Zod por tipo de custom field.
 *
 * `schemaForField(definition)` despacha pelo `type` da definition e respeita
 * `required` + `config` (min/max/options). Mensagens em pt-BR para alinhar
 * com formularios atuais.
 *
 * Importante: esses schemas validam o INPUT do form (cliente). O backend
 * tambem valida via `validators/field-type-dispatch.ts`. Em divergencia,
 * o backend e a fonte de verdade — UI deve refletir 422 do PATCH.
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

/**
 * Compoe um schema Zod para um custom field a partir da definition.
 *
 * Regras:
 * - `required = true` -> base schema sem `.optional()` (TEXT exige `min(1)`).
 * - `required = false` -> base schema com `.optional()`.
 * - DROPDOWN sem opcoes: cai em `z.never()` para falhar previsivelmente em vez
 *   de quebrar com runtime do `z.enum([])`.
 */
export function schemaForField(d: CustomFieldDefinition): z.ZodTypeAny {
  switch (d.type) {
    case 'TEXT':
      return d.required ? textSchema.min(1, 'Campo obrigatorio') : textSchema.optional();

    case 'NUMBER': {
      const schema = numberSchema(d.config?.min, d.config?.max);
      return d.required ? schema : schema.optional();
    }

    case 'CURRENCY':
      return d.required ? currencySchema : currencySchema.optional();

    case 'DATE':
      return d.required ? dateSchema : dateSchema.optional();

    case 'DROPDOWN': {
      const options = (d.config?.options ?? []).map((opt) => opt.value);
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
  }
}
