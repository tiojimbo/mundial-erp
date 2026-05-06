/**
 * Dispatcher de validacao por `CustomFieldType`.
 *
 * Cada tipo possui regras distintas:
 *   - TEXT       — string sanitizada (HTML stripado), max 5000 chars
 *   - NUMBER     — number, honra `config.min` e `config.max`
 *   - CURRENCY   — number >= 0, armazenado em Decimal(18,4)
 *   - DATE       — ISO 8601 string ou Date convertida em Date
 *   - DROPDOWN   — string presente em `config.options[].value`
 *   - CPF/CNPJ   — delegacao para validator + normalizacao em digitos
 *   - EMAIL/PHONE/URL — validators dedicados
 *
 * Retorno padronizado:
 *   - `valid: true`  + `normalized` (string|number|Date) para persistir.
 *   - `valid: false` + `reason` (motivo curto pt-BR).
 *
 * O service consome esse dispatcher antes do upsert e mapeia o resultado para
 * `valueText | valueNumber | valueDate` da row `CustomFieldValue`.
 */

import { CustomFieldType } from '@prisma/client';
import { validateCnpj } from './cnpj.validator';
import { validateCpf } from './cpf.validator';
import { validateEmail } from './email.validator';
import { validatePhone } from './phone.validator';
import { validateUrl } from './url.validator';

export type NormalizedValue = string | number | Date;

export interface FieldDispatchResult {
  valid: boolean;
  normalized?: NormalizedValue;
  reason?: string;
}

/**
 * Forma minima da definition consumida pelo dispatcher. Aceitamos um shape
 * flexivel para nao acoplar o validator ao tipo gerado pelo Prisma — o
 * service traduz a row para esse contrato.
 */
export interface DefinitionShape {
  type: CustomFieldType;
  required: boolean;
  config: unknown;
}

/**
 * Forma minima usada pelo `validateRequiredWhen` (precisa do `label` para
 * compor mensagem de erro alem do `config`). Mantida separada para nao
 * impor `label` em todos os call sites do dispatcher legacy.
 */
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

const TEXT_MAX_LENGTH = 5_000;

function sanitizeText(value: string): string {
  // Strip de HTML conservador: remove tags <...> sem tentar parsing complexo.
  // O frontend trata renderizacao com escape via React; aqui o objetivo e
  // remover injecoes <script>...</script>, <iframe ...>, etc.
  return value.replace(/<[^>]*>/g, '').trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateValue(
  type: CustomFieldType,
  rawValue: unknown,
  definition: DefinitionShape,
): FieldDispatchResult {
  // Tratamento de null/undefined: se o campo eh required sem valor -> erro.
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (definition.required) {
      return { valid: false, reason: 'Campo obrigatorio' };
    }
    // Permitir limpeza explicita do valor.
    return { valid: true, normalized: undefined as unknown as string };
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
      return { valid: true, normalized: sanitized };
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
      return { valid: true, normalized: parsed };
    }

    case CustomFieldType.CURRENCY: {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        return { valid: false, reason: 'CURRENCY invalido' };
      }
      if (parsed < 0) {
        return { valid: false, reason: 'CURRENCY nao pode ser negativo' };
      }
      // Decimal(18,4) cabe ate 14 digitos antes do ponto (~10^14). Escolhemos
      // 1e14 como teto pratico para evitar literal com perda de precisao em
      // double — capturamos 99,99% dos casos uteis sem flertar com o limite.
      if (parsed >= 1e14) {
        return { valid: false, reason: 'CURRENCY excede limite' };
      }
      return { valid: true, normalized: parsed };
    }

    case CustomFieldType.DATE: {
      const date =
        rawValue instanceof Date ? rawValue : new Date(String(rawValue));
      if (Number.isNaN(date.getTime())) {
        return { valid: false, reason: 'DATE invalido (use ISO 8601)' };
      }
      return { valid: true, normalized: date };
    }

    case CustomFieldType.DROPDOWN: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'DROPDOWN espera string' };
      }
      const cfg = isPlainObject(definition.config)
        ? (definition.config as DropdownConfig)
        : {};
      const options = Array.isArray(cfg.options) ? cfg.options : [];
      const allowed = new Set(
        options
          .filter(
            (opt): opt is DropdownOption =>
              isPlainObject(opt) &&
              typeof (opt as DropdownOption).value === 'string',
          )
          .map((opt) => opt.value),
      );
      if (allowed.size === 0) {
        return {
          valid: false,
          reason: 'DROPDOWN sem options configuradas',
        };
      }
      if (!allowed.has(rawValue)) {
        return {
          valid: false,
          reason: 'Valor fora das options permitidas',
        };
      }
      return { valid: true, normalized: rawValue };
    }

    case CustomFieldType.CPF: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'CPF espera string' };
      }
      const result = validateCpf(rawValue);
      if (!result.valid) {
        return { valid: false, reason: result.reason };
      }
      return { valid: true, normalized: result.normalized };
    }

    case CustomFieldType.CNPJ: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'CNPJ espera string' };
      }
      const result = validateCnpj(rawValue);
      if (!result.valid) {
        return { valid: false, reason: result.reason };
      }
      return { valid: true, normalized: result.normalized };
    }

    case CustomFieldType.EMAIL: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'EMAIL espera string' };
      }
      const result = validateEmail(rawValue);
      if (!result.valid) {
        return { valid: false, reason: result.reason };
      }
      return { valid: true, normalized: result.normalized };
    }

    case CustomFieldType.PHONE: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'PHONE espera string' };
      }
      const result = validatePhone(rawValue);
      if (!result.valid) {
        return { valid: false, reason: result.reason };
      }
      return { valid: true, normalized: result.normalized };
    }

    case CustomFieldType.URL: {
      if (typeof rawValue !== 'string') {
        return { valid: false, reason: 'URL espera string' };
      }
      const result = validateUrl(rawValue);
      if (!result.valid) {
        return { valid: false, reason: result.reason };
      }
      return { valid: true, normalized: result.normalized };
    }

    default: {
      const exhaustive: never = type;
      void exhaustive;
      return { valid: false, reason: 'Tipo nao suportado' };
    }
  }
}

/**
 * Resultado da validacao condicional `requiredWhen`. Sem `normalized` porque
 * essa funcao nao transforma o valor — apenas decide se a tupla
 * (field, value) viola a regra de obrigatoriedade condicional.
 */
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

/**
 * Validacao server-side da regra `config.requiredWhen` (PLANO-TASK-TYPES-
 * TEMPLATES, Regra de Negocio #4).
 *
 * Se `definition.config.requiredWhen.{field, equals}` esta presente:
 *   - Procura o valor de `field` (por `key`) nos demais custom fields da
 *     mesma task (mapa `otherFieldsByKey`).
 *   - Se esse valor === `equals`, esta definicao passa a ser obrigatoria
 *     mesmo que `definition.required = false`.
 *   - Quando obrigatoria pelo trigger, valor nulo/undefined/string vazia
 *     resulta em `{ ok: false, reason }` com mensagem identificando label,
 *     campo trigger e valor esperado.
 *
 * Comportamento sem `requiredWhen` em config: retorna `{ ok: true }` sem
 * inspecionar nada (zero impacto em definitions legadas).
 */
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
