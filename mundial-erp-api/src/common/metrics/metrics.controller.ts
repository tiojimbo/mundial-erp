/**
 * MetricsController — expoe `GET /metrics` no formato Prometheus 0.0.4
 * (Sprint 5 — TTT-050).
 *
 * Decisoes de seguranca (agent-cto §"Seguranca"):
 *   - `@Public()` para pular `JwtAuthGuard` global — `/metrics` e raspado
 *     por scraper sem JWT do usuario.
 *   - Auth via Bearer token (env `METRICS_TOKEN`). Quando o token nao
 *     existe ou e vazio, o endpoint retorna 503 ("metrics disabled") —
 *     evita exposicao acidental em deploy mal configurado.
 *   - Comparacao em tempo constante para evitar timing attacks.
 *   - Fica fora do `setGlobalPrefix('api/v1')` (excluido em main.ts) para
 *     casar com a convencao Prometheus de raspar `/metrics` na raiz.
 */
import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Registry } from 'prom-client';
import { Public } from '../decorators';
import { PROM_REGISTRY } from './metrics.tokens';

@Public()
@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(PROM_REGISTRY) private readonly registry: Registry,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async dump(
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const expectedToken = this.config.get<string>('METRICS_TOKEN');
    if (!expectedToken) {
      // Sem token configurado = endpoint desabilitado.
      throw new HttpException(
        'metrics disabled',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const provided = parseBearer(authHeader);
    if (!provided || !safeEqual(provided, expectedToken)) {
      // 401 generico — nunca diferenciamos "token errado" de "missing".
      throw new HttpException('unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const body = await this.registry.metrics();
    res
      .status(HttpStatus.OK)
      .setHeader('Content-Type', this.registry.contentType)
      .send(body);
  }
}

function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
