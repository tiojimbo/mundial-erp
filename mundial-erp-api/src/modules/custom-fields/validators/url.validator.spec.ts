/**
 * Unit tests — URL validator (PLANO-TASK-TYPES-TEMPLATES Sprint 1, TTT-012).
 *
 * Whitelist de protocolo: apenas `http:` e `https:`.
 * Owner: Tatiana (TTT-014). Implementado por Beatriz em TTT-012.
 */
import { validateUrl } from './url.validator';

describe('URL validator (validateUrl)', () => {
  const validUrls = [
    'https://a.com',
    'http://a.com/x?y=1',
    'https://www.mundial.com.br/path/to/resource?utm=foo&utm_source=bar',
    'https://sub.dominio.app:8443/route#section',
    'http://localhost:3000/api/v1/health',
  ];

  const invalidUrls = [
    'ftp://files.example.com',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '',
    'sem-protocolo.com',
    'www.exemplo.com',
    '   ',
    'https//no-colon.com',
  ];

  it.each(validUrls)('aceita URL valida: %s', (url) => {
    const res = validateUrl(url);
    expect(res.valid).toBe(true);
    expect(res.normalized).toBeDefined();
  });

  it.each(invalidUrls)('rejeita URL invalida: %s', (url) => {
    const res = validateUrl(url);
    expect(res.valid).toBe(false);
  });

  it('rejeita protocolo `javascript:` com motivo explicito', () => {
    const res = validateUrl('javascript:alert(1)');
    expect(res.valid).toBe(false);
    expect(res.reason?.toLowerCase()).toContain('protocolo');
  });

  it('normaliza URL com toString() canonico', () => {
    const res = validateUrl('https://Exemplo.com');
    expect(res.valid).toBe(true);
    // URL().toString() faz lowercase do host e adiciona trailing slash.
    expect(res.normalized).toBe('https://exemplo.com/');
  });

  it('rejeita null', () => {
    const res = validateUrl(null as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita undefined', () => {
    const res = validateUrl(undefined as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita number', () => {
    const res = validateUrl(12345 as unknown as string);
    expect(res.valid).toBe(false);
  });

  it('rejeita objeto', () => {
    const res = validateUrl({ url: 'https://a.com' } as unknown as string);
    expect(res.valid).toBe(false);
  });
});
