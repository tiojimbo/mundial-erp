import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CycleDetectionTimeoutException } from '../exceptions/cycle-detection-timeout.exception';
import { DependencyGraphTooLargeException } from '../exceptions/dependency-graph-too-large.exception';

type CycleDetectorPrismaClient = Pick<Prisma.TransactionClient, 'workItem'>;

export interface DetectCycleParams {
  fromId: string;
  toId: string;
  tx: CycleDetectorPrismaClient;
}

export const CYCLE_DETECTOR_NODE_LIMIT = 1000;
export const CYCLE_DETECTOR_TIMEOUT_MS = 2000;

/**
 * BFS de deteccao de ciclo na hierarquia de subtasks (parent/child).
 * Usado por merge e operacoes que reorganizam a arvore de tasks.
 *
 * Contratos:
 *   - Parte de `toId` e segue `WorkItem.parentId` invertido (filhos diretos).
 *   - Se alcancar `fromId`, retorna `true` (criar `from -> to` fecha ciclo).
 *   - Limite duro: 1000 nodes -> {@link DependencyGraphTooLargeException}.
 *   - Timeout: 2s -> {@link CycleDetectionTimeoutException}.
 */
@Injectable()
export class CycleDetectorService {
  private readonly logger = new Logger(CycleDetectorService.name);

  async detectCycle(params: DetectCycleParams): Promise<boolean> {
    const { fromId, toId } = params;

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
    const { fromId, toId, tx } = params;
    const limit = CYCLE_DETECTOR_NODE_LIMIT;
    const visited = new Set<string>();
    const queue: string[] = [toId];
    visited.add(toId);

    while (queue.length > 0) {
      const current = queue.shift() as string;

      if (visited.size > limit) {
        throw new DependencyGraphTooLargeException(visited.size, limit);
      }

      const neighbors = await this.fetchChildren(tx, current);
      for (const neighborId of neighbors) {
        if (neighborId === fromId) {
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

  private async fetchChildren(
    tx: CycleDetectorPrismaClient,
    nodeId: string,
  ): Promise<string[]> {
    const rows = await tx.workItem.findMany({
      where: { parentId: nodeId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
}
