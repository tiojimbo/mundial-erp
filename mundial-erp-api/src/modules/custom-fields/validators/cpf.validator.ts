/**
 * Validador de CPF (Cadastro de Pessoa Fisica).
 *
 * Regras:
 *   - Aceita formatos `XXX.XXX.XXX-XX` ou `XXXXXXXXXXX` (11 digitos crus).
 *   - Calcula os 2 digitos verificadores conforme a Receita Federal.
 *   - Rejeita sequencias com todos os digitos repetidos
 *     (`000.000.000-00`, `111.111.111-11`, ..., `999.999.999-99`).
 *
 * Retorno:
 *   - `valid: true` + `normalized: string` (so digitos) em caso de sucesso.
 *   - `valid: false` + `reason: string` com motivo curto em portugues.
 *
 * Cobertura por testes unitarios em `cpf.validator.spec.ts` (TTT-014, Tatiana).
 */

const CPF_FORMAT = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

export interface CpfValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

export function validateCpf(value: string): CpfValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, reason: 'CPF vazio' };
  }

  if (!CPF_FORMAT.test(value)) {
    return { valid: false, reason: 'Formato de CPF invalido' };
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) {
    return { valid: false, reason: 'CPF deve conter 11 digitos' };
  }

  // Rejeita CPFs com todos os digitos iguais (000..., 111..., ..., 999...).
  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, reason: 'CPF com digitos repetidos invalido' };
  }

  // Calculo do primeiro digito verificador.
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits.charAt(9))) {
    return { valid: false, reason: 'Digito verificador 1 invalido' };
  }

  // Calculo do segundo digito verificador.
  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits.charAt(10))) {
    return { valid: false, reason: 'Digito verificador 2 invalido' };
  }

  return { valid: true, normalized: digits };
}
