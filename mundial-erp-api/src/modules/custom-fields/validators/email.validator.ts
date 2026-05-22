/**
 * Validador de e-mail simplificado (RFC light).
 *
 * Regras:
 *   - Regex RFC simplificada: `local@dominio.tld`.
 *   - Maximo 320 caracteres totais (RFC 5321 secao 4.5.3.1.1).
 *   - Sem espacos, sem `@` extra.
 *
 * Normalizacao: lowercase do dominio (parte apos `@`). Local-part preservado
 * (case-sensitive segundo a RFC, embora muitos provedores ignorem).
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 320;

export interface EmailValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

export function validateEmail(value: string): EmailValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, reason: 'E-mail vazio' };
  }
  if (value.length > MAX_LENGTH) {
    return { valid: false, reason: `E-mail excede ${MAX_LENGTH} caracteres` };
  }
  if (!EMAIL_REGEX.test(value)) {
    return { valid: false, reason: 'Formato de e-mail invalido' };
  }

  const atIndex = value.lastIndexOf('@');
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1).toLowerCase();
  return { valid: true, normalized: `${local}@${domain}` };
}
