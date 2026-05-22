/**
 * Sprint 2 (TTT-021) — Mascaras simples para CPF / CNPJ / PHONE.
 *
 * Conforme prompt: NAO usar libs externas pesadas; regex simples basta.
 * Validacao real de digito verificador fica no backend
 * (`mundial-erp-api/src/modules/custom-fields/validators/`) — aqui apenas
 * formatamos para exibicao + Zod faz match de regex (PLANO §"Sanitizacao").
 */

const onlyDigits = (input: string): string => input.replace(/\D+/g, '');

const truncate = (digits: string, max: number): string => digits.slice(0, max);

export function maskCpf(input: string): string {
  const digits = truncate(onlyDigits(input), 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function maskCnpj(input: string): string {
  const digits = truncate(onlyDigits(input), 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

/**
 * Mascara telefones BR (10 ou 11 digitos: fixo `(99) 9999-9999`,
 * celular `(99) 99999-9999`). Aceita +55 inicial — descarta para mascara.
 */
export function maskPhone(input: string): string {
  const digits = truncate(onlyDigits(input.replace(/^\+?55/, '')), 11);
  if (digits.length <= 2) {
    return digits.length === 0 ? '' : `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
