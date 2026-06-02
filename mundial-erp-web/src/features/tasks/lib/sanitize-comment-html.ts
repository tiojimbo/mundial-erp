import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
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
];

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'class',
  'data-content-type',
  'data-node-type',
  'data-id',
];

let hookRegistered = false;

function ensureAnchorHook(): void {
  if (hookRegistered) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
      node.setAttribute('target', '_blank');
    }
  });
  hookRegistered = true;
}

export function sanitizeCommentHtml(
  html: string | null | undefined,
): string {
  if (!html) return '';
  ensureAnchorHook();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
