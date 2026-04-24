import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DTO skeletons (PLANO-KOMMO-DASHBOARD §6).
 *
 * Shapes completos vem na proxima rodada quando OAuth + schema Prisma
 * estiverem merged (Larissa + squad-auth). Por ora sao tipos vazios —
 * suficientes para a assinatura dos metodos.
 */
export interface KommoAccountDto {
  readonly kommoAccountId: string;
  readonly subdomain: string;
}

export interface KommoPipelineDto {
  readonly kommoPipelineId: string;
  readonly name: string;
}

/**
 * Algoritmos de HMAC aceitos para o webhook Kommo.
 *
 * `sha256` e o unico valor suportado — qualquer outro (md5, sha1) e
 * REJEITADO (anti algorithm downgrade). Ver ADR-005.
 */
export type KommoHmacAlgorithm = 'sha256';

/**
 * `KommoApiClient` — fachada unica para chamadas a API publica do Kommo
 * (auth + listagens) + utilitario de verificacao de assinatura HMAC dos
 * webhooks.
 *
 * Esta e a versao **skeleton** (Sprint 1). Metodos de rede lancam
 * `NotImplementedException` — serao preenchidos quando o fluxo OAuth2 +
 * schema KommoAccount estiverem prontos (proxima rodada).
 *
 * O unico metodo ja funcional e `validateHmac`, porque o webhook
 * controller da proxima rodada ja vai precisar dele e porque validar HMAC
 * e pura verificacao criptografica — nao depende de I/O nem do schema.
 *
 * Convencoes (PLANO-KOMMO-DASHBOARD §8, squad-kommo.mdc #4 #13):
 *   - Todos os logs sao estruturados: `{ operation, requestId?,
 *     workspaceId?, kommoAccountId?, duration_ms? }`.
 *   - NUNCA logar accessToken, refreshToken ou hmacSecret — nem truncado,
 *     nem em erro, nem em debug.
 *   - Zero `console.log`. Sempre `this.logger`.
 *   - Zero `any`. DTOs tipados.
 */
@Injectable()
export class KommoApiClient {
  private readonly logger = new Logger(KommoApiClient.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Busca metadados da conta Kommo (`account` endpoint).
   *
   * TODO(sprint-2): implementar OAuth2 refresh + HTTP GET para
   * `https://{subdomain}.kommo.com/api/v4/account` com rate-limit
   * awareness (PLANO §8.9) + circuit breaker.
   */
  getAccount(_accountId: string): Promise<KommoAccountDto> {
    throw new NotImplementedException(
      'KommoApiClient.getAccount: schema KommoAccount + OAuth nao disponiveis nesta rodada',
    );
  }

  /**
   * Lista pipelines da conta Kommo.
   *
   * TODO(sprint-2): GET `/api/v4/leads/pipelines` paginado + traducao
   * para `KommoPipelineDto[]`.
   */
  listPipelines(_accountId: string): Promise<KommoPipelineDto[]> {
    throw new NotImplementedException(
      'KommoApiClient.listPipelines: schema KommoAccount + OAuth nao disponiveis nesta rodada',
    );
  }

  /**
   * Renova accessToken a partir de refreshToken persistido.
   *
   * TODO(sprint-2): POST `/oauth2/access_token` (grant_type=refresh_token)
   * + envelope encryption (ADR-006) ao reescrever token no banco +
   * rotacao segura (descartar refreshToken antigo).
   */
  refreshToken(_accountId: string): Promise<void> {
    throw new NotImplementedException(
      'KommoApiClient.refreshToken: fluxo OAuth nao disponivel nesta rodada',
    );
  }

  /**
   * Valida a assinatura HMAC de um webhook Kommo.
   *
   * Decisao: ADR-005 (`kommo-webhook-hmac`). Resumo:
   *   - Unico algoritmo aceito: HMAC-SHA256 (anti algorithm downgrade).
   *   - `timingSafeEqual` obrigatorio (anti timing attack).
   *   - Signature ausente/vazia, tamanho divergente ou algoritmo
   *     inesperado retornam `false` sem lancar (sinal unificado para o
   *     controller responder 401).
   *
   * @param rawBody Corpo bruto do webhook (Buffer do middleware `raw()` ou
   *                string se ja decodificado). IMPORTANTE: nunca serializar
   *                JSON de novo aqui — quebraria o hash.
   * @param signature Header enviado pelo Kommo (hex-encoded).
   * @param secret hmacSecret desencriptado da linha `KommoAccount`.
   * @param algorithm Algoritmo do HMAC — sempre `'sha256'` (default).
   * @returns `true` se a assinatura bate, `false` caso contrario.
   */
  validateHmac(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
    algorithm: KommoHmacAlgorithm = 'sha256',
  ): boolean {
    // Anti algorithm downgrade (ADR-005 §Decision). Qualquer outro valor
    // aqui — md5, sha1, '' — rejeita. TypeScript ja restringe o tipo mas
    // a checagem runtime protege consumidores JS ou paths que venham de
    // JSON parse.
    if (algorithm !== 'sha256') {
      this.logger.warn(
        {
          operation: 'validateHmac',
          outcome: 'algorithm_rejected',
          algorithm,
        },
        'Unsupported HMAC algorithm — only sha256 is accepted',
      );
      return false;
    }

    if (typeof signature !== 'string' || signature.length === 0) {
      return false;
    }

    if (typeof secret !== 'string' || secret.length === 0) {
      return false;
    }

    const bodyBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(rawBody, 'utf8');

    // Payload vazio + signature vazia = rejeitar. Cobre caso patologico de
    // webhook sem body mas com header forjado.
    if (bodyBuffer.length === 0 && signature.length === 0) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(bodyBuffer).digest();

    // `timingSafeEqual` requer tamanhos iguais — se o header veio com
    // tamanho errado (ex: 63 chars em vez de 64 hex), curto-circuitamos.
    // Essa comparacao NAO e timing-safe mas so vaza "tamanho do header
    // bate", que nao revela nada sobre o secret.
    let received: Buffer;
    try {
      received = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    if (received.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(received, expected);
  }
}
