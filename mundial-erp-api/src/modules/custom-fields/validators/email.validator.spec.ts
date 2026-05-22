/**
 * Unit tests — EMAIL validator (PLANO-TASK-TYPES-TEMPLATES Sprint 1, TTT-012).
 *
 * Owner: Tatiana (TTT-014). Implementado por Beatriz em TTT-012.
 */
import { validateEmail } from './email.validator';

describe('EMAIL validator (validateEmail)', () => {
  const validEmails = [
    'a@b.co',
    'usuario@mundial.com.br',
    'user.name+tag@example.org',
    'first.last@subdomain.example.com',
    'numero1@dominio2.dev',
  ];

  const invalidEmails = [
    'a@',
    '@b.co',
    'a.b.co',
    'sem-arroba.com',
    'duplo@@dominio.com',
    'com espaco@dominio.com',
    'user@dominio com.com',
    '',
    ' ',
  ];

  it.each(validEmails)('aceita email valido: %s', (email) => {
    const res = validateEmail(email);
    expect(res.valid).toBe(true);
    expect(res.normalized).toBeDefined();
  });

  it.each(invalidEmails)('rejeita email invalido: %s', (email) => {
    const res = validateEmail(email);
    expect(res.valid).toBe(false);
  });

  it('normaliza dominio para lowercase', () => {
    const res = validateEmail('UsUaRio@Dominio.COM.BR');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('UsUaRio@dominio.com.br');
  });

  it('rejeita email com mais de 320 caracteres', () => {
    const longLocal = 'a'.repeat(64);
    const longDomain = `${'b'.repeat(255)}.com`;
    const tooLong = `${longLocal}@${longDomain}x`;
    expect(tooLong.length).toBeGreaterThan(320);
    const res = validateEmail(tooLong);
    expect(res.valid).toBe(false);
    expect(res.reason).toBeDefined();
  });

  it('rejeita null', () => {
    const res = validateEmail(null as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita undefined', () => {
    const res = validateEmail(undefined as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita number', () => {
    const res = validateEmail(123 as unknown as string);
    expect(res.valid).toBe(false);
  });
});
