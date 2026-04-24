import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Defesa contra DoS: a BFS de deteccao de ciclo tem timeout de 2 segundos.
 * Superar indica banco saturado ou grafo patologico — preferimos 408 a deixar
 * a requisicao segurar recursos indefinidamente.
 *
 * Semantica HTTP: 408 Request Timeout.
 *
 * Ver PLANO-TASKS.md §8.3 e `agent-cto.md` (DoS defense).
 */
export class CycleDetectionTimeoutException extends HttpException {
  constructor(timeoutMs: number) {
    super(
      {
        message: `Deteccao de ciclo excedeu o tempo limite de ${timeoutMs}ms.`,
        error: 'CycleDetectionTimeout',
        code: 'CYCLE_DETECTION_TIMEOUT',
        timeoutMs,
      },
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}
