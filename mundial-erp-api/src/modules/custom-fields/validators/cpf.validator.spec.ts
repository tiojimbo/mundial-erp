/**
 * Unit tests — CPF validator (PLANO-TASK-TYPES-TEMPLATES Sprint 1, TTT-012).
 *
 * Cobertura exigida pelo brief TTT-014:
 *   - Aceita CPFs validos (calculados via algoritmo da Receita Federal),
 *     com ou sem mascara.
 *   - Rejeita CPFs com todos os digitos repetidos
 *     (000.000.000-00, 111.111.111-11, ..., 999.999.999-99). Esses passam
 *     no algoritmo de DV mas sao falsos positivos conhecidos.
 *   - Rejeita tamanhos diferentes de 11 digitos.
 *   - Rejeita string vazia, null, undefined, number e objeto.
 *
 * API publica: `validateCpf(value: string): {valid, normalized?, reason?}`.
 *
 * Owner: Tatiana (TTT-014). Implementado por Beatriz em TTT-012.
 */
import { validateCpf } from './cpf.validator';

describe('CPF validator (validateCpf)', () => {
  // CPFs validos calculados algoritmicamente — DV correto e digitos NAO repetidos.
  const validCpfs = [
    '12345678909',
    '52998224725',
    '39053344705',
    '98765432100',
    '11111111200',
  ];

  const repeatedCpfs = Array.from({ length: 10 }, (_, i): string =>
    String(i).repeat(11),
  );

  it.each(validCpfs)('aceita CPF valido sem mascara: %s', (cpf) => {
    const res = validateCpf(cpf);
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe(cpf);
  });

  it('aceita CPF valido com mascara `123.456.789-09` e normaliza para 11 digitos', () => {
    const res = validateCpf('123.456.789-09');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('12345678909');
  });

  it('aceita CPF valido com mascara `529.982.247-25`', () => {
    const res = validateCpf('529.982.247-25');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('52998224725');
  });

  it.each(repeatedCpfs)(
    'rejeita CPF com todos os digitos repetidos: %s',
    (cpf) => {
      const res = validateCpf(cpf);
      expect(res.valid).toBe(false);
      expect(res.reason).toBeDefined();
    },
  );

  it('rejeita CPF com DV invalido (12345678900)', () => {
    const res = validateCpf('12345678900');
    expect(res.valid).toBe(false);
  });

  it('rejeita CPF com 10 digitos', () => {
    const res = validateCpf('1234567890');
    expect(res.valid).toBe(false);
  });

  it('rejeita CPF com 12 digitos', () => {
    const res = validateCpf('123456789091');
    expect(res.valid).toBe(false);
  });

  it('rejeita string vazia com motivo "CPF vazio"', () => {
    const res = validateCpf('');
    expect(res.valid).toBe(false);
    expect(res.reason?.toLowerCase()).toContain('vazio');
  });

  it('rejeita string com caracteres alfanumericos', () => {
    const res = validateCpf('abc.def.ghi-jk');
    expect(res.valid).toBe(false);
  });

  it('rejeita null', () => {
    const res = validateCpf(null as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita undefined', () => {
    const res = validateCpf(undefined as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita number (nao-string)', () => {
    const res = validateCpf(12345678909 as unknown as string);
    expect(res.valid).toBe(false);
  });
});
