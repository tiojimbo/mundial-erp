/**
 * MetricsModule (Sprint 5 — TTT-050).
 *
 * Provedor global do `prom-client.Registry`. Modulos de feature criam
 * suas metricas (Counter/Histogram/Gauge) e as registram neste registry
 * unico — assim o endpoint `GET /metrics` expoe todas no mesmo dump.
 *
 * Decisao de simplicidade (agent-cto):
 *   - Nao usamos `collectDefaultMetrics` por padrao (CPU/heap do Node)
 *     pra manter o payload enxuto. Pode ser ligado por env quando ops
 *     precisarem (RFC futura).
 *   - Endpoint `GET /metrics` exige Bearer token (env `METRICS_TOKEN`).
 *     Quando o token nao e configurado, o endpoint responde 503 — nao
 *     vaza nada por default em produ.
 */
import { Global, Module } from '@nestjs/common';
import { Registry } from 'prom-client';
import { MetricsController } from './metrics.controller';
import { PROM_REGISTRY } from './metrics.tokens';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    {
      provide: PROM_REGISTRY,
      useFactory: () => new Registry(),
    },
  ],
  exports: [PROM_REGISTRY],
})
export class MetricsModule {}
