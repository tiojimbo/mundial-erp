import { BadRequestException } from '@nestjs/common';

/**
 * Defesa contra DoS: a BFS de deteccao de ciclo tem limite de 1000 nodes
 * visitados. Ultrapassar indica grafo excessivamente grande (possivel ataque
 * ou corrupcao de dados).
 *
 * Semantica HTTP: 400 Bad Request — cliente ta pedindo uma operacao que
 * expoe um grafo inviavel; rejeitamos antes de tocar o banco.
 *
 * Ver PLANO-TASKS.md §8.3 e `agent-cto.md` (DoS defense).
 */
export class DependencyGraphTooLargeException extends BadRequestException {
  constructor(visitedCount: number, limit: number) {
    super({
      message: `Grafo de dependencias excede o limite (${visitedCount} nodes visitados, limite ${limit}). Operacao abortada por seguranca.`,
      error: 'DependencyGraphTooLarge',
      code: 'DEPENDENCY_GRAPH_TOO_LARGE',
      visitedCount,
      limit,
    });
  }
}
