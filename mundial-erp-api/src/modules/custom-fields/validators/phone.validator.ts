/**
 * Validador de telefone (formato brasileiro com tolerancia para internacional).
 *
 * Aceita:
 *   - `+55 (DD) 9XXXX-XXXX`
 *   - `+55 (DD) XXXX-XXXX`
 *   - `(DD) 9XXXX-XXXX`
 *   - `(DD) XXXX-XXXX`
 *   - `DD9XXXXXXXX` ou `DDXXXXXXXX`
 *   - `+55DD9XXXXXXXX`
 *
 * Normalizacao: somente digitos, conservando o prefixo do pais quando presente.
 *   - 10 digitos -> fixo (DDD + 8 digitos).
 *   - 11 digitos -> celular (DDD + 9 + 8 digitos).
 *   - 12-13 digitos -> internacional (CC + DDD + numero).
 */

const PHONE_REGEX = /^[+\s()\-\d]+$/;

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

export function validatePhone(value: string): PhoneValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, reason: 'Telefone vazio' };
  }

  if (!PHONE_REGEX.test(value)) {
    return { valid: false, reason: 'Caracteres invalidos no telefone' };
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 13) {
    return {
      valid: false,
      reason: 'Telefone deve conter entre 10 e 13 digitos',
    };
  }

  // BR sem codigo do pais (10 ou 11 digitos): DDD valido (11..99).
  if (digits.length === 10 || digits.length === 11) {
    const ddd = Number(digits.substring(0, 2));
    if (ddd < 11) {
      return { valid: false, reason: 'DDD invalido' };
    }
  }

  // BR com codigo do pais 55 (12 ou 13 digitos).
  if (digits.length === 12 || digits.length === 13) {
    if (!digits.startsWith('55')) {
      return {
        valid: false,
        reason: 'Apenas telefones BR (DDI 55) sao aceitos no momento',
      };
    }
  }

  return { valid: true, normalized: digits };
}
