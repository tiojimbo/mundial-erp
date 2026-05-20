import { CustomFieldType } from '@prisma/client';
import { validateCnpj } from './cnpj.validator';
import { validateCpf } from './cpf.validator';
import { validateEmail } from './email.validator';
import { validatePhone } from './phone.validator';
import { validateUrl } from './url.validator';

export type ValueColumn =
  | 'valueText'
  | 'valueNumber'
  | 'valueDate'
  | 'valueJson'
  | 'valueBoolean';

export type NormalizedValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | Record<string, unknown>;

export interface FieldDispatchResult {
  valid: boolean;
  normalized?: NormalizedValue;
  column?: ValueColumn;
  reason?: string;
}

export interface DefinitionShape {
  type: CustomFieldType;
  required: boolean;
  config: unknown;
  options?: unknown;
}

export interface DefinitionRequiredWhenShape {
  label: string;
  config: unknown;
}

interface RequiredWhenRule {
  field: string;
  equals: string;
}

interface DropdownOption {
  value: string;
  label?: string;
}

interface NumberConfig {
  min?: number;
  max?: number;
}

interface DropdownConfig {
  options?: DropdownOption[];
}

interface RatingConfig {
  maxStars?: number;
}

const TEXT_MAX_LENGTH = 5_000;
const ID_REGEX = /^[0-9a-zA-Z_-]{8,64}$/;
const DURATION_UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_REGEX.test(value);
}

function extractStringOptions(definition: DefinitionShape): string[] {
  const rootOptions = Array.isArray(definition.options)
    ? definition.options
    : [];
  const fromRoot = rootOptions
    .map((opt) => {
      if (typeof opt === 'string') return opt;
      if (isPlainObject(opt) && typeof opt.value === 'string') return opt.value;
      return null;
    })
    .filter((v): v is string => v !== null);
  if (fromRoot.length > 0) return fromRoot;

  const cfg = isPlainObject(definition.config)
    ? (definition.config as DropdownConfig)
    : {};
  const cfgOptions = Array.isArray(cfg.options) ? cfg.options : [];
  return cfgOptions
    .filter(
      (opt): opt is DropdownOption =>
        isPlainObject(opt) && typeof (opt as DropdownOption).value === 'string',
    )
    .map((opt) => opt.value);
}

export function validateValue(
  type: CustomFieldType,
  rawValue: unknown,
  definition: DefinitionShape,
): FieldDispatchResult {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (definition.required) {
      return { valid: false, reason: 'Campo obrigatorio' };
    }
    return { valid: true };
  }

  switch (type) {
    case CustomFieldType.TEXT: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'TEXT espera string' };
      }
      const sanitized = sanitizeText(rawValue);
      if (sanitized.length > TEXT_MAX_LENGTH) {
        return {
          valid: false,
          reason: `Texto excede ${TEXT_MAX_LENGTH} caracteres`,
        };
      }
      if (definition.required && sanitized.length === 0) {
        return { valid: false, reason: 'Campo obrigatorio' };
      }
      return { valid: true, normalized: sanitized, column: 'valueText' };
    }

    case CustomFieldType.NUMBER: {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        return { valid: false, reason: 'NUMBER invalido' };
      }
      const cfg = isPlainObject(definition.config)
        ? (definition.config as NumberConfig)
        : {};
      if (typeof cfg.min === 'number' && parsed < cfg.min) {
        return { valid: false, reason: `Valor minimo: ${cfg.min}` };
      }
      if (typeof cfg.max === 'number' && parsed > cfg.max) {
        return { valid: false, reason: `Valor maximo: ${cfg.max}` };
      }
      return { valid: true, normalized: parsed, column: 'valueNumber' };
    }

    case CustomFieldType.CURRENCY: {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        return { valid: false, reason: 'CURRENCY invalido' };
      }
      if (parsed < 0) {
        return { valid: false, reason: 'CURRENCY nao pode ser negativo' };
      }
      // Decimal(18,4) — teto pratico abaixo de 1e14 pra evitar perda em double.
      if (parsed >= 1e14) {
        return { valid: false, reason: 'CURRENCY excede limite' };
      }
      return { valid: true, normalized: parsed, column: 'valueNumber' };
    }

    case CustomFieldType.DATE: {
      const date =
        rawValue instanceof Date ? rawValue : new Date(String(rawValue));
      if (Number.isNaN(date.getTime())) {
        return { valid: false, reason: 'DATE invalido (use ISO 8601)' };
      }
      return { valid: true, normalized: date, column: 'valueDate' };
    }

    case CustomFieldType.DROPDOWN:
    case CustomFieldType.SELECT:
    case CustomFieldType.LABEL: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: `${type} espera string` };
      }
      const allowed = new Set(extractStringOptions(definition));
      if (allowed.size === 0) {
        return { valid: false, reason: `${type} sem options configuradas` };
      }
      if (!allowed.has(rawValue)) {
        return { valid: false, reason: 'Valor fora das options permitidas' };
      }
      return { valid: true, normalized: rawValue, column: 'valueText' };
    }

    case CustomFieldType.CPF: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'CPF espera string' };
      }
      const result = validateCpf(rawValue);
      if (!result.valid) return { valid: false, reason: result.reason };
      return {
        valid: true,
        normalized: result.normalized,
        column: 'valueText',
      };
    }

    case CustomFieldType.CNPJ: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'CNPJ espera string' };
      }
      const result = validateCnpj(rawValue);
      if (!result.valid) return { valid: false, reason: result.reason };
      return {
        valid: true,
        normalized: result.normalized,
        column: 'valueText',
      };
    }

    case CustomFieldType.EMAIL: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'EMAIL espera string' };
      }
      const result = validateEmail(rawValue);
      if (!result.valid) return { valid: false, reason: result.reason };
      return {
        valid: true,
        normalized: result.normalized,
        column: 'valueText',
      };
    }

    case CustomFieldType.PHONE: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'PHONE espera string' };
      }
      const result = validatePhone(rawValue);
      if (!result.valid) return { valid: false, reason: result.reason };
      return {
        valid: true,
        normalized: result.normalized,
        column: 'valueText',
      };
    }

    case CustomFieldType.URL: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'URL espera string' };
      }
      const result = validateUrl(rawValue);
      if (!result.valid) return { valid: false, reason: result.reason };
      return {
        valid: true,
        normalized: result.normalized,
        column: 'valueText',
      };
    }

    case CustomFieldType.CHECKBOX: {
      if (typeof rawValue !== 'boolean') {
        return { valid: false, reason: 'CHECKBOX espera boolean' };
      }
      return { valid: true, normalized: rawValue, column: 'valueBoolean' };
    }

    case CustomFieldType.PERCENTAGE: {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        return { valid: false, reason: 'PERCENTAGE invalido' };
      }
      const cfg = isPlainObject(definition.config)
        ? (definition.config as NumberConfig)
        : {};
      const min = typeof cfg.min === 'number' ? cfg.min : 0;
      const max = typeof cfg.max === 'number' ? cfg.max : 100;
      if (parsed < min || parsed > max) {
        return {
          valid: false,
          reason: `PERCENTAGE fora do intervalo [${min}, ${max}]`,
        };
      }
      return { valid: true, normalized: parsed, column: 'valueNumber' };
    }

    case CustomFieldType.DURATION: {
      let ms: number | null = null;
      if (typeof rawValue === 'number') {
        ms = rawValue;
      } else if (isPlainObject(rawValue)) {
        const v = (rawValue as { value?: unknown }).value;
        const u = (rawValue as { unit?: unknown }).unit;
        const value = typeof v === 'number' ? v : Number(v);
        const unit = typeof u === 'string' ? u : 'ms';
        const factor = DURATION_UNIT_MS[unit];
        if (factor === undefined) {
          return { valid: false, reason: `DURATION unit invalida: ${unit}` };
        }
        if (Number.isNaN(value) || !Number.isFinite(value)) {
          return { valid: false, reason: 'DURATION.value invalido' };
        }
        ms = value * factor;
      } else {
        return {
          valid: false,
          reason: 'DURATION espera number (ms) ou {value, unit}',
        };
      }
      if (!Number.isFinite(ms) || ms < 0) {
        return { valid: false, reason: 'DURATION deve ser >= 0' };
      }
      return { valid: true, normalized: ms, column: 'valueNumber' };
    }

    case CustomFieldType.RATING: {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
        return { valid: false, reason: 'RATING espera inteiro' };
      }
      const cfg = isPlainObject(definition.config)
        ? (definition.config as RatingConfig)
        : {};
      const maxStars =
        typeof cfg.maxStars === 'number' && cfg.maxStars > 0 ? cfg.maxStars : 5;
      if (parsed < 0 || parsed > maxStars) {
        return {
          valid: false,
          reason: `RATING fora do intervalo [0, ${maxStars}]`,
        };
      }
      return { valid: true, normalized: parsed, column: 'valueNumber' };
    }

    case CustomFieldType.USER: {
      if (!isValidId(rawValue)) {
        return { valid: false, reason: 'USER espera id valido' };
      }
      return { valid: true, normalized: rawValue, column: 'valueText' };
    }

    case CustomFieldType.TEAM: {
      if (!isValidId(rawValue)) {
        return { valid: false, reason: 'TEAM espera id valido' };
      }
      return { valid: true, normalized: rawValue, column: 'valueText' };
    }

    case CustomFieldType.PEOPLE: {
      if (!Array.isArray(rawValue)) {
        return { valid: false, reason: 'PEOPLE espera array de ids' };
      }
      if (rawValue.length === 0 && definition.required) {
        return { valid: false, reason: 'Campo obrigatorio' };
      }
      const ids: string[] = [];
      const seen = new Set<string>();
      for (const item of rawValue) {
        if (!isValidId(item)) {
          return { valid: false, reason: 'PEOPLE contem id invalido' };
        }
        if (seen.has(item)) {
          return { valid: false, reason: 'PEOPLE contem ids duplicados' };
        }
        seen.add(item);
        ids.push(item);
      }
      return { valid: true, normalized: ids, column: 'valueJson' };
    }

    case CustomFieldType.RELATIONSHIP: {
      if (!Array.isArray(rawValue)) {
        return { valid: false, reason: 'RELATIONSHIP espera array de taskIds' };
      }
      if (rawValue.length === 0 && definition.required) {
        return { valid: false, reason: 'Campo obrigatorio' };
      }
      const ids: string[] = [];
      const seen = new Set<string>();
      for (const item of rawValue) {
        if (!isValidId(item)) {
          return {
            valid: false,
            reason: 'RELATIONSHIP contem taskId invalido',
          };
        }
        if (seen.has(item)) {
          return {
            valid: false,
            reason: 'RELATIONSHIP contem taskIds duplicados',
          };
        }
        seen.add(item);
        ids.push(item);
      }
      return { valid: true, normalized: ids, column: 'valueJson' };
    }

    case CustomFieldType.ROLLUP: {
      return {
        valid: false,
        reason: 'ROLLUP e readonly (calculado pelo servidor)',
      };
    }

    default: {
      const exhaustive: never = type;
      void exhaustive;
      return { valid: false, reason: 'Tipo nao suportado' };
    }
  }
}

export interface RequiredWhenResult {
  ok: boolean;
  reason?: string;
}

function isRequiredWhenRule(value: unknown): value is RequiredWhenRule {
  if (!isPlainObject(value)) return false;
  const candidate = value as { field?: unknown; equals?: unknown };
  return (
    typeof candidate.field === 'string' && typeof candidate.equals === 'string'
  );
}

export function validateRequiredWhen(
  definition: DefinitionRequiredWhenShape,
  value: unknown,
  otherFieldsByKey: Map<string, unknown>,
): RequiredWhenResult {
  if (!isPlainObject(definition.config)) {
    return { ok: true };
  }
  const rule = (definition.config as { requiredWhen?: unknown }).requiredWhen;
  if (!isRequiredWhenRule(rule)) {
    return { ok: true };
  }

  const triggerValue = otherFieldsByKey.get(rule.field);
  const isTriggered = triggerValue === rule.equals;
  if (!isTriggered) {
    return { ok: true };
  }

  const isEmpty = value === null || value === undefined || value === '';
  if (isEmpty) {
    return {
      ok: false,
      reason: `Campo '${definition.label}' e obrigatorio quando '${rule.field}' = '${rule.equals}'.`,
    };
  }
  return { ok: true };
}
