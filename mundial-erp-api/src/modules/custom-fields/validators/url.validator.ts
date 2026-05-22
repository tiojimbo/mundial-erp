/**
 * Validador de URL (somente HTTP/HTTPS).
 *
 * Usa o construtor `URL` do runtime para validacao. Rejeita protocolos como
 * `file:`, `javascript:`, `data:` etc.
 *
 * Normalizacao: serializacao canonica via `URL.toString()` (lowercase do host,
 * trailing slash adicionado em paths vazios, etc.).
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export interface UrlValidationResult {
  valid: boolean;
  normalized?: string;
  reason?: string;
}

export function validateUrl(value: string): UrlValidationResult {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, reason: 'URL vazia' };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { valid: false, reason: 'URL malformada' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return {
      valid: false,
      reason: `Protocolo "${url.protocol}" nao permitido (use http ou https)`,
    };
  }

  return { valid: true, normalized: url.toString() };
}
