import sanitizeHtml from 'sanitize-html';

const HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'h1',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'u',
    's',
    'code',
    'pre',
    'blockquote',
    'a',
    'br',
    'hr',
    'span',
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['class', 'data-content-type', 'data-node-type', 'data-id'],
    div: ['class', 'data-content-type', 'data-node-type', 'data-id'],
    p: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (_tag, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        rel: 'noopener noreferrer',
        target: attribs.target || '_blank',
      },
    }),
  },
};

export function sanitizeDescriptionHtml(
  html: string | null | undefined,
): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html, HTML_OPTIONS).trim();
  if (isEmptyHtml(clean)) return null;
  return clean;
}

export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const stripped = html
    .replace(/<br\s*\/?>(?=\s*<\/p>|\s*$)/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return stripped.length === 0;
}
