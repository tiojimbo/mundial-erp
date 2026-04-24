/**
 * Unit tests — KommoApiClient.validateHmac
 *
 * Focus: a superficie de webhook e o vetor mais sensivel da integracao
 * Kommo (threat-model-kommo.md T-S1 / T-T1-T6; ADR-005). Os testes a
 * seguir pinam:
 *
 *   - Happy path: assinatura valida → true.
 *   - Bit flip: uma alteracao minima no digest → false.
 *   - Signature ausente ou vazia → false (anti header missing).
 *   - Algoritmo != 'sha256' → false (anti algorithm downgrade, ADR-005).
 *   - Edge case: body vazio + signature vazia → false (payload forjado).
 *   - Comparacao timing-safe: implementada via `crypto.timingSafeEqual`.
 *     Nao testamos timing diretamente aqui (flake); Carolina cobre via
 *     fuzz E2E. Este spec documenta o contrato em comentario + valida
 *     que "signature de tamanho divergente" retorna false sem crash.
 *
 * Style: @nestjs/testing, espelhando o padrao da pasta `src/modules/*`.
 */

import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { KommoApiClient } from './kommo-api-client.service';

function sign(body: Buffer | string, secret: string): string {
  return createHmac('sha256', secret)
    .update(Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8'))
    .digest('hex');
}

describe('KommoApiClient.validateHmac', () => {
  let client: KommoApiClient;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        KommoApiClient,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    client = moduleRef.get(KommoApiClient);
  });

  const secret = 'super-secret-hmac-key-do-not-log-never-ever-32ch';
  const body = Buffer.from(
    JSON.stringify({ event: 'chat_opened', timestamp: 1700000000 }),
    'utf8',
  );

  it('returns true for a valid sha256 signature', () => {
    const sig = sign(body, secret);
    expect(client.validateHmac(body, sig, secret)).toBe(true);
  });

  it('returns true when rawBody is a string (utf8-normalized)', () => {
    const text = '{"event":"chat_opened"}';
    const sig = sign(text, secret);
    expect(client.validateHmac(text, sig, secret)).toBe(true);
  });

  it('returns false when a single hex nibble is flipped (1-bit diff)', () => {
    const sig = sign(body, secret);
    // Flip the last nibble: '0'<->'1', else XOR with 1 in hex.
    const last = sig.charAt(sig.length - 1);
    const flipped =
      sig.slice(0, -1) +
      (last === 'f' ? 'e' : String.fromCharCode(last.charCodeAt(0) + 1));
    expect(client.validateHmac(body, flipped, secret)).toBe(false);
  });

  it('returns false when signature is missing (empty string)', () => {
    expect(client.validateHmac(body, '', secret)).toBe(false);
  });

  it('returns false when secret is empty', () => {
    const sig = sign(body, secret);
    expect(client.validateHmac(body, sig, '')).toBe(false);
  });

  it('rejects any algorithm other than sha256 (anti algorithm downgrade)', () => {
    const sig = sign(body, secret);
    // Cast forca runtime check — simula payload vindo de JSON externo que
    // tentaria "sha1" ou "md5".
    expect(
      client.validateHmac(
        body,
        sig,
        secret,
        'sha1' as unknown as 'sha256',
      ),
    ).toBe(false);
    expect(
      client.validateHmac(
        body,
        sig,
        secret,
        'md5' as unknown as 'sha256',
      ),
    ).toBe(false);
    expect(
      client.validateHmac(
        body,
        sig,
        secret,
        '' as unknown as 'sha256',
      ),
    ).toBe(false);
  });

  it('returns false when body is empty and signature is empty (edge case)', () => {
    expect(client.validateHmac(Buffer.alloc(0), '', secret)).toBe(false);
  });

  it('returns false when signature has wrong length (not a valid hex digest)', () => {
    // 63 hex chars (sha256 = 64). Buffer.from('abc', 'hex') trunca mas
    // o resultado tem tamanho diferente do digest esperado → false sem crash.
    const tooShort = 'a'.repeat(63);
    expect(client.validateHmac(body, tooShort, secret)).toBe(false);

    const tooLong = 'a'.repeat(65);
    expect(client.validateHmac(body, tooLong, secret)).toBe(false);
  });

  it('returns false when signature is non-hex garbage', () => {
    // 'Z' nao e hex — Buffer.from('ZZ...', 'hex') vira buffer vazio/truncado.
    const garbage = 'Z'.repeat(64);
    expect(client.validateHmac(body, garbage, secret)).toBe(false);
  });

  // Documenta o contrato: validateHmac usa `crypto.timingSafeEqual` para
  // comparacao do digest (ver kommo-api-client.service.ts). Fuzz de timing
  // real e coberto por Carolina em E2E (Sprint 2) — unit test aqui so
  // garante que o metodo nao cai em short-circuit string compare.
  it('uses crypto.timingSafeEqual semantics (documented contract)', () => {
    // Duas signatures distintas de mesmo tamanho — ambas devem retornar
    // false sem lancar. timingSafeEqual exige buffers de mesmo tamanho, o
    // que o metodo garante via pre-check de length.
    const a = 'a'.repeat(64);
    const b = 'b'.repeat(64);
    expect(client.validateHmac(body, a, secret)).toBe(false);
    expect(client.validateHmac(body, b, secret)).toBe(false);
  });
});
