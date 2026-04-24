/**
 * Gera um `Idempotency-Key` RFC 4122 v4.
 *
 * Usado em operacoes nao-idempotentes com side-effects pesados:
 * - POST /tasks/:id/merge                (PLANO §8.4)
 * - POST /tasks/:id/attachments          (defesa em profundidade)
 *
 * Backend faz Redis SETNX com TTL 24h: chamadas repetidas retornam o
 * resultado cacheado sem repetir side-effects.
 */
export function generateIdempotencyKey(): string {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback RFC 4122 v4 compatible — suficiente como key de idempotencia.
  const bytes = new Uint8Array(16);
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return (
    `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-` +
    `${hex[4]}${hex[5]}-` +
    `${hex[6]}${hex[7]}-` +
    `${hex[8]}${hex[9]}-` +
    `${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
  );
}
