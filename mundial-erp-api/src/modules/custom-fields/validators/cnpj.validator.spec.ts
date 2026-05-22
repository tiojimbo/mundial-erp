/**
 * Unit tests — CNPJ validator (PLANO-TASK-TYPES-TEMPLATES Sprint 1, TTT-012).
 *
 * Mesmas regras do CPF: 14 digitos, DV obrigatorio, repetidos rejeitados.
 *
 * Owner: Tatiana (TTT-014). Implementado por Beatriz em TTT-012.
 */
import { validateCnpj } from './cnpj.validator';

describe('CNPJ validator (validateCnpj)', () => {
  const validCnpjs = [
    '12345678000195',
    '11222333000181',
    '44556677000186',
    '00987654000150',
  ];

  const repeatedCnpjs = Array.from({ length: 10 }, (_, i): string =>
    String(i).repeat(14),
  );

  it.each(validCnpjs)('aceita CNPJ valido sem mascara: %s', (cnpj) => {
    const res = validateCnpj(cnpj);
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe(cnpj);
  });

  it('aceita CNPJ com mascara `12.345.678/0001-95` e normaliza', () => {
    const res = validateCnpj('12.345.678/0001-95');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('12345678000195');
  });

  it('aceita CNPJ com mascara `11.222.333/0001-81`', () => {
    const res = validateCnpj('11.222.333/0001-81');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('11222333000181');
  });

  it.each(repeatedCnpjs)(
    'rejeita CNPJ com todos os digitos repetidos: %s',
    (cnpj) => {
      const res = validateCnpj(cnpj);
      expect(res.valid).toBe(false);
      expect(res.reason).toBeDefined();
    },
  );

  it('rejeita CNPJ com DV invalido (12345678000100)', () => {
    const res = validateCnpj('12345678000100');
    expect(res.valid).toBe(false);
  });

  it('rejeita CNPJ com 13 digitos', () => {
    const res = validateCnpj('1234567800019');
    expect(res.valid).toBe(false);
  });

  it('rejeita CNPJ com 15 digitos', () => {
    const res = validateCnpj('123456780001951');
    expect(res.valid).toBe(false);
  });

  it('rejeita string vazia com motivo `vazio`', () => {
    const res = validateCnpj('');
    expect(res.valid).toBe(false);
    expect(res.reason?.toLowerCase()).toContain('vazio');
  });

  it('rejeita string com letras', () => {
    const res = validateCnpj('ab.cde.fgh/ijkl-mn');
    expect(res.valid).toBe(false);
  });

  it('rejeita null', () => {
    const res = validateCnpj(null as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita undefined', () => {
    const res = validateCnpj(undefined as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita number puro', () => {
    const res = validateCnpj(12345678000195 as unknown as string);
    expect(res.valid).toBe(false);
  });
});
