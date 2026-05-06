/**
 * Validador de CNPJ (Cadastro Nacional da Pessoa Juridica).
 *
 * Regras:
 *   - Aceita formatos `XX.XXX.XXX/XXXX-XX` ou `XXXXXXXXXXXXXX` (14 digitos crus).
 *   - Calcula os 2 digitos verificadores conforme a Receita Federal.
 *   - Rejeita sequencias com todos os digitos repetidos
 *     (`00.000.000/0000-00`, ..., `99.999.999/9999-99`).
 *
 * Retorno:
 *   - `valid: true` + `normalized: string` (so digitos) em caso de sucesso.
 *   - `valid: false` + `reason: string` com motivo curto em portugues.
 */

const CNPJ_FORMAT = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export interface CnpjValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

function calcDigit(digits: string, weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i += 1) {
    sum += Number(digits.charAt(i)) * weights[i];
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function validateCnpj(value: string): CnpjValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, reason: 'CNPJ vazio' };
  }

  if (!CNPJ_FORMAT.test(value)) {
    return { valid: false, reason: 'Formato de CNPJ invalido' };
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) {
    return { valid: false, reason: 'CNPJ deve conter 14 digitos' };
  }

  if (/^(\d)\1{13}$/.test(digits)) {
    return { valid: false, reason: 'CNPJ com digitos repetidos invalido' };
  }

  const d1 = calcDigit(digits.substring(0, 12), FIRST_WEIGHTS);
  if (d1 !== Number(digits.charAt(12))) {
    return { valid: false, reason: 'Digito verificador 1 invalido' };
  }
  const d2 = calcDigit(digits.substring(0, 13), SECOND_WEIGHTS);
  if (d2 !== Number(digits.charAt(13))) {
    return { valid: false, reason: 'Digito verificador 2 invalido' };
  }

  return { valid: true, normalized: digits };
}
