import { isEmptyHtml, sanitizeDescriptionHtml } from './description-html.util';

describe('description-html.util', () => {
  describe('isEmptyHtml', () => {
    it.each([
      ['null/undefined/string vazia', '', true],
      ['paragrafo vazio', '<p></p>', true],
      ['paragrafo so com <br>', '<p><br></p>', true],
      ['varios paragrafos vazios', '<p></p><p><br></p><p></p>', true],
      ['paragrafo com texto', '<p>oi</p>', false],
      ['heading com texto', '<h1>Bug</h1>', false],
      ['lista com item', '<ul><li>x</li></ul>', false],
    ])('%s -> %s', (_label, input, expected) => {
      expect(isEmptyHtml(input)).toBe(expected);
    });

    it('aceita null e undefined', () => {
      expect(isEmptyHtml(null)).toBe(true);
      expect(isEmptyHtml(undefined)).toBe(true);
    });
  });

  describe('sanitizeDescriptionHtml', () => {
    it('retorna null pra entrada vazia/nula', () => {
      expect(sanitizeDescriptionHtml('')).toBeNull();
      expect(sanitizeDescriptionHtml(null)).toBeNull();
      expect(sanitizeDescriptionHtml(undefined)).toBeNull();
    });

    it('retorna null pra HTML visualmente vazio', () => {
      expect(sanitizeDescriptionHtml('<p></p><p><br></p>')).toBeNull();
    });

    it('remove tags fora da whitelist preservando texto', () => {
      const out = sanitizeDescriptionHtml('<p>ok</p><script>alert(1)</script>');
      expect(out).toBe('<p>ok</p>');
    });

    it('remove iframes e img', () => {
      const out = sanitizeDescriptionHtml(
        '<p>x</p><iframe src="http://evil"></iframe><img src="x" onerror="bad()">',
      );
      expect(out).toBe('<p>x</p>');
    });

    it('aceita tags ricas do BlockNote (heading, listas, formatacao)', () => {
      const html =
        '<h1>Titulo</h1><h2>Sub</h2><ul><li>a</li><li><strong>b</strong></li></ul><p>texto <em>italico</em> e <code>codigo</code></p>';
      const out = sanitizeDescriptionHtml(html);
      expect(out).toContain('<h1>Titulo</h1>');
      expect(out).toContain('<ul><li>a</li>');
      expect(out).toContain('<strong>b</strong>');
      expect(out).toContain('<em>italico</em>');
      expect(out).toContain('<code>codigo</code>');
    });

    it('preserva atributos data-* do BlockNote em divs/spans', () => {
      const html =
        '<div class="bn-block" data-content-type="paragraph" data-id="abc"><p>x</p></div>';
      const out = sanitizeDescriptionHtml(html);
      expect(out).toContain('data-content-type="paragraph"');
      expect(out).toContain('data-id="abc"');
      expect(out).toContain('class="bn-block"');
    });

    it('forca rel=noopener e target=_blank em <a>', () => {
      const out = sanitizeDescriptionHtml(
        '<p>vai em <a href="https://exemplo.com">link</a></p>',
      );
      expect(out).toContain('rel="noopener noreferrer"');
      expect(out).toContain('target="_blank"');
    });

    it('rejeita schemes nao whitelisted em <a href>', () => {
      const out = sanitizeDescriptionHtml(
        '<p><a href="javascript:alert(1)">x</a></p>',
      );
      expect(out).not.toContain('javascript:');
    });

    it('aceita mailto', () => {
      const out = sanitizeDescriptionHtml(
        '<p><a href="mailto:a@b.com">email</a></p>',
      );
      expect(out).toContain('href="mailto:a@b.com"');
    });
  });
});
