/**
 * Unit tests — PHONE validator (PLANO-TASK-TYPES-TEMPLATES Sprint 1, TTT-012).
 *
 * O validator aceita exclusivamente telefones BR (DDI 55 quando explicito).
 * Owner: Tatiana (TTT-014). Implementado por Beatriz em TTT-012.
 */
import { validatePhone } from './phone.validator';

describe('PHONE validator (validatePhone)', () => {
  const validPhones = [
    '+55 (11) 91234-5678',
    '(11) 91234-5678',
    '11912345678',
    '(11) 1234-5678', // fixo 10 digitos
    '1112345678',
    '+55 11 91234 5678',
    '+551191234-5678',
  ];

  const invalidPhones = [
    '1234567', // 7 digitos
    '123456', // 6 digitos
    '1234567890123456', // 16 digitos > E.164
    '912345678', // 9 digitos sem DDD
    '',
    'abcdefghij',
    '+55 (11) abcde-fghi',
  ];

  it.each(validPhones)('aceita telefone valido: %s', (phone) => {
    const res = validatePhone(phone);
    expect(res.valid).toBe(true);
    expect(res.normalized).toMatch(/^\d{10,13}$/u);
  });

  it.each(invalidPhones)('rejeita telefone invalido: %s', (phone) => {
    const res = validatePhone(phone);
    expect(res.valid).toBe(false);
  });

  it('rejeita DDD invalido (00) com motivo claro', () => {
    const res = validatePhone('0012345678');
    expect(res.valid).toBe(false);
    expect(res.reason?.toLowerCase()).toContain('ddd');
  });

  it('rejeita DDI nao-BR (12 digitos comecando por 11) — politica atual: BR-only', () => {
    const res = validatePhone('114155552671');
    expect(res.valid).toBe(false);
  });

  it('rejeita null', () => {
    const res = validatePhone(null as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita undefined', () => {
    const res = validatePhone(undefined as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita number', () => {
    const res = validatePhone(11912345678 as unknown as string);
    expect(res.valid).toBe(false);
  });
});
