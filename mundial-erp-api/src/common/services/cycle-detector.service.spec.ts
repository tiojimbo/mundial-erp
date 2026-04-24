/**
 * Unit tests para CycleDetectorService.
 *
 * Cobertura (TSK-302):
 *   - Sem ciclo  -> false
 *   - Ciclo direto A<->B -> true
 *   - Ciclo indireto A->B->C->A -> true
 *   - Limite 1000 nodes -> throws DependencyGraphTooLargeException
 *   - Timeout 2s -> throws CycleDetectionTimeoutException
 *   - Cold path (sem relacoes) -> false em < 10ms
 *   - Relation=subtask: detecta descendente (usado no merge-cycle guard)
 *
 * Estrategia de mock: o service so depende dos delegates
 * `workItemDependency.findMany` e `workItem.findMany`. Um objeto literal com
 * essa superficie basta — nao precisamos subir PrismaClient real.
 */

import {
  CYCLE_DETECTOR_NODE_LIMIT,
  CYCLE_DETECTOR_TIMEOUT_MS,
  CycleDetectorService,
} from './cycle-detector.service';
import { CycleDetectionTimeoutException } from '../exceptions/cycle-detection-timeout.exception';
import { DependencyGraphTooLargeException } from '../exceptions/dependency-graph-too-large.exception';

type DependencyEdge = { fromTaskId: string; toTaskId: string };
type SubtaskEdge = { parentId: string; id: string };

interface MockTx {
  workItemDependency: { findMany: jest.Mock };
  workItem: { findMany: jest.Mock };
}

function buildDependencyTx(edges: DependencyEdge[]): MockTx {
  return {
    workItemDependency: {
      findMany: jest.fn(async (args: { where: { fromTaskId: string } }) => {
        return edges
          .filter((edge) => edge.fromTaskId === args.where.fromTaskId)
          .map((edge) => ({ toTaskId: edge.toTaskId }));
      }),
    },
    workItem: { findMany: jest.fn(async () => []) },
  };
}

function buildSubtaskTx(edges: SubtaskEdge[]): MockTx {
  return {
    workItemDependency: { findMany: jest.fn(async () => []) },
    workItem: {
      findMany: jest.fn(async (args: { where: { parentId: string } }) => {
        return edges
          .filter((edge) => edge.parentId === args.where.parentId)
          .map((edge) => ({ id: edge.id }));
      }),
    },
  };
}

describe('CycleDetectorService', () => {
  let service: CycleDetectorService;

  beforeEach(() => {
    service = new CycleDetectorService();
  });

  describe('relation = dependency', () => {
    it('retorna false quando nao existe ciclo', async () => {
      // Grafo: A -> B, B -> C.  Criar D -> A nao fecha ciclo.
      const tx = buildDependencyTx([
        { fromTaskId: 'A', toTaskId: 'B' },
        { fromTaskId: 'B', toTaskId: 'C' },
      ]);

      const result = await service.detectCycle({
        fromId: 'D',
        toId: 'A',
        relation: 'dependency',
        tx: tx as never,
      });

      expect(result).toBe(false);
    });

    it('detecta ciclo direto A<->B (A->B existente, tentando B->A)', async () => {
      // Grafo tem A -> B; agora tentamos inserir B -> A. BFS partindo de A
      // alcanca B (A -> B), logo B -> A fecharia ciclo.
      const tx = buildDependencyTx([{ fromTaskId: 'A', toTaskId: 'B' }]);

      const result = await service.detectCycle({
        fromId: 'B',
        toId: 'A',
        relation: 'dependency',
        tx: tx as never,
      });

      expect(result).toBe(true);
    });

    it('detecta ciclo indireto A->B->C->A', async () => {
      // Grafo existente: A->B, B->C. Tentamos inserir C -> A.
      // BFS partindo de A alcanca B -> C, logo C -> A fecha ciclo.
      const tx = buildDependencyTx([
        { fromTaskId: 'A', toTaskId: 'B' },
        { fromTaskId: 'B', toTaskId: 'C' },
      ]);

      const result = await service.detectCycle({
        fromId: 'C',
        toId: 'A',
        relation: 'dependency',
        tx: tx as never,
      });

      expect(result).toBe(true);
    });

    it('retorna true quando fromId === toId (auto-dependencia)', async () => {
      const tx = buildDependencyTx([]);

      const result = await service.detectCycle({
        fromId: 'A',
        toId: 'A',
        relation: 'dependency',
        tx: tx as never,
      });

      expect(result).toBe(true);
      // Nem precisou ir ao banco.
      expect(tx.workItemDependency.findMany).not.toHaveBeenCalled();
    });

    it('cold path (nenhuma relacao) -> false em < 10ms', async () => {
      const tx = buildDependencyTx([]);

      const started = Date.now();
      const result = await service.detectCycle({
        fromId: 'A',
        toId: 'B',
        relation: 'dependency',
        tx: tx as never,
      });
      const elapsed = Date.now() - started;

      expect(result).toBe(false);
      expect(elapsed).toBeLessThan(10);
    });

    it('lanca DependencyGraphTooLargeException acima de 1000 nodes', async () => {
      // Gera cadeia linear 0 -> 1 -> 2 -> ... -> 1200; nunca fecha.
      const chainLength = CYCLE_DETECTOR_NODE_LIMIT + 200;
      const edges: DependencyEdge[] = [];
      for (let i = 0; i < chainLength - 1; i++) {
        edges.push({ fromTaskId: `n${i}`, toTaskId: `n${i + 1}` });
      }
      const tx = buildDependencyTx(edges);

      await expect(
        service.detectCycle({
          fromId: 'never-reached',
          toId: 'n0',
          relation: 'dependency',
          tx: tx as never,
        }),
      ).rejects.toBeInstanceOf(DependencyGraphTooLargeException);
    });

    it('lanca CycleDetectionTimeoutException ao estourar 2s', async () => {
      // Mock lento: cada findMany dorme timeoutMs + buffer.
      const slowTx: MockTx = {
        workItemDependency: {
          findMany: jest.fn(
            () =>
              new Promise((resolve) =>
                setTimeout(
                  () => resolve([{ toTaskId: 'never' }]),
                  CYCLE_DETECTOR_TIMEOUT_MS + 200,
                ),
              ),
          ),
        },
        workItem: { findMany: jest.fn(async () => []) },
      };

      await expect(
        service.detectCycle({
          fromId: 'from',
          toId: 'to',
          relation: 'dependency',
          tx: slowTx as never,
        }),
      ).rejects.toBeInstanceOf(CycleDetectionTimeoutException);
      // Limpa o timer pendente da busca lenta antes de o Jest encerrar.
    }, 10000);
  });

  describe('relation = subtask', () => {
    it('detecta target descendente de source (merge-cycle guard)', async () => {
      // Hierarquia: source -> childA -> target.
      // Tentamos merge target <- source. BFS partindo de source deve achar target.
      const tx = buildSubtaskTx([
        { parentId: 'source', id: 'childA' },
        { parentId: 'childA', id: 'target' },
      ]);

      const result = await service.detectCycle({
        fromId: 'target',
        toId: 'source',
        relation: 'subtask',
        tx: tx as never,
      });

      expect(result).toBe(true);
    });

    it('retorna false quando target nao e descendente', async () => {
      const tx = buildSubtaskTx([{ parentId: 'source', id: 'child' }]);

      const result = await service.detectCycle({
        fromId: 'unrelated',
        toId: 'source',
        relation: 'subtask',
        tx: tx as never,
      });

      expect(result).toBe(false);
    });
  });
});
