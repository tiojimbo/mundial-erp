import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CycleDetectionTimeoutException } from '../exceptions/cycle-detection-timeout.exception';
import { DependencyGraphTooLargeException } from '../exceptions/dependency-graph-too-large.exception';

/**
 * Cliente Prisma aceito pelo detector: tanto o `PrismaClient` direto quanto
 * um `Prisma.TransactionClient` ($transaction). Em ambos os casos precisamos
 * apenas dos delegates `workItemDependency` e `workItem`.
 */
type CycleDetectorPrismaClient = Pick<
  Prisma.TransactionClient,
  'workItemDependency' | 'workItem'
>;

export type CycleRelation = 'dependency' | 'subtask';

export interface DetectCycleParams {
  /** Origem da aresta que se pretende criar (ex.: tarefa que bloqueia). */
  fromId: string;
  /** Destino da aresta que se pretende criar (ex.: tarefa bloqueada). */
  toId: string;
  /**
   * - `dependency`: segue `WorkItemDependency.toTaskId` (edges saindo via
   *   `WorkItem.dependenciesOut`). Detecta se criar aresta `from -> to`
   *   fecharia um ciclo no grafo de dependencias.
   * - `subtask`: segue `WorkItem.parentId` invertido (dado um node, pergunta
   *   "quem sao meus filhos?"). Usado para validar se o `target` de um merge
   *   e descendente de algum `source` (merge-cycle guard).
   */
  relation: CycleRelation;
  /**
   * Cliente Prisma (ou transaction client). Exigir injecao explicita permite
   * o servico rodar dentro de qualquer `$transaction`.
   */
  tx: CycleDetectorPrismaClient;
}

/**
 * Limites defensivos (DoS guard) — ver PLANO-TASKS.md §8.3 e agent-cto.md.
 * Publicos para testes/observabilidade.
 */
export const CYCLE_DETECTOR_NODE_LIMIT = 1000;
export const CYCLE_DETECTOR_TIMEOUT_MS = 2000;

/**
 * BFS de deteccao de ciclo sobre o grafo de dependencias ou de subtasks.
 *
 * Contratos:
 *   - Parte de `toId`. Se alcancar `fromId`, retorna `true`.
 *   - Parada dura: 1000 nodes visitados -> {@link DependencyGraphTooLargeException}.
 *   - Parada temporal: 2s -> {@link CycleDetectionTimeoutException} (Promise.race).
 *   - Cold path (sem relacoes) retorna `false` sem bloquear o event-loop.
 *
 * Complexidade: O(V + E) no caminho feliz; limitada a O(1000) arestas
 * traversadas no pior caso pelo node-limit. Cada fetch e um roundtrip
 * batched em `IN (...)` quando ha fan-out.
 */
@Injectable()
export class CycleDetectorService {
  private readonly logger = new Logger(CycleDetectorService.name);

  async detectCycle(params: DetectCycleParams): Promise<boolean> {
    const { fromId, toId } = params;

    // Caso trivial: a aresta `from -> from` ja e um ciclo.
    if (fromId === toId) {
      return true;
    }

    const timeoutMs = CYCLE_DETECTOR_TIMEOUT_MS;
    let timer: NodeJS.Timeout | undefined;

    const work = this.bfs(params);
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new CycleDetectionTimeoutException(timeoutMs));
      }, timeoutMs);
      // Evita segurar o event-loop no shutdown do Node.
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    try {
      return await Promise.race([work, timeout]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  private async bfs(params: DetectCycleParams): Promise<boolean> {
    const { fromId, toId, relation, tx } = params;
    const limit = CYCLE_DETECTOR_NODE_LIMIT;
    const visited = new Set<string>();
    const queue: string[] = [toId];
    visited.add(toId);

    while (queue.length > 0) {
      const current = queue.shift() as string;

      if (visited.size > limit) {
        throw new DependencyGraphTooLargeException(visited.size, limit);
      }

      const neighbors = await this.fetchNeighbors(tx, relation, current);
      for (const neighborId of neighbors) {
        if (neighborId === fromId) {
          // Alcancamos o `from` a partir do `to` -> criar `from -> to` fecha ciclo.
          return true;
        }
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          if (visited.size > limit) {
            throw new DependencyGraphTooLargeException(visited.size, limit);
          }
          queue.push(neighborId);
        }
      }
    }

    return false;
  }

  private async fetchNeighbors(
    tx: CycleDetectorPrismaClient,
    relation: CycleRelation,
    nodeId: string,
  ): Promise<string[]> {
    if (relation === 'dependency') {
      const rows = await tx.workItemDependency.findMany({
        where: { fromTaskId: nodeId },
        select: { toTaskId: true },
      });
      return rows.map((row) => row.toTaskId);
    }

    // relation === 'subtask' -> filhos diretos (children). Um ciclo ocorre se,
    // descendo pela subtree, reencontramos o `fromId`.
    const rows = await tx.workItem.findMany({
      where: { parentId: nodeId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
}
