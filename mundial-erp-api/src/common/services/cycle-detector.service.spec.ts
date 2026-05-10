import {
  CYCLE_DETECTOR_NODE_LIMIT,
  CYCLE_DETECTOR_TIMEOUT_MS,
  CycleDetectorService,
} from './cycle-detector.service';
import { CycleDetectionTimeoutException } from '../exceptions/cycle-detection-timeout.exception';
import { DependencyGraphTooLargeException } from '../exceptions/dependency-graph-too-large.exception';

type SubtaskEdge = { parentId: string; id: string };

interface MockTx {
  workItem: { findMany: jest.Mock };
}

function buildTx(edges: SubtaskEdge[]): MockTx {
  return {
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

  it('detecta target descendente de source (merge-cycle guard)', async () => {
    const tx = buildTx([
      { parentId: 'source', id: 'childA' },
      { parentId: 'childA', id: 'target' },
    ]);

    const result = await service.detectCycle({
      fromId: 'target',
      toId: 'source',
      tx: tx as never,
    });

    expect(result).toBe(true);
  });

  it('retorna false quando target nao e descendente', async () => {
    const tx = buildTx([{ parentId: 'source', id: 'child' }]);

    const result = await service.detectCycle({
      fromId: 'unrelated',
      toId: 'source',
      tx: tx as never,
    });

    expect(result).toBe(false);
  });

  it('retorna true quando fromId === toId', async () => {
    const tx = buildTx([]);

    const result = await service.detectCycle({
      fromId: 'A',
      toId: 'A',
      tx: tx as never,
    });

    expect(result).toBe(true);
    expect(tx.workItem.findMany).not.toHaveBeenCalled();
  });

  it('cold path (sem filhos) -> false em < 10ms', async () => {
    const tx = buildTx([]);

    const started = Date.now();
    const result = await service.detectCycle({
      fromId: 'A',
      toId: 'B',
      tx: tx as never,
    });
    const elapsed = Date.now() - started;

    expect(result).toBe(false);
    expect(elapsed).toBeLessThan(10);
  });

  it('lanca DependencyGraphTooLargeException acima do limite', async () => {
    const chainLength = CYCLE_DETECTOR_NODE_LIMIT + 200;
    const edges: SubtaskEdge[] = [];
    for (let i = 0; i < chainLength - 1; i++) {
      edges.push({ parentId: `n${i}`, id: `n${i + 1}` });
    }
    const tx = buildTx(edges);

    await expect(
      service.detectCycle({
        fromId: 'never-reached',
        toId: 'n0',
        tx: tx as never,
      }),
    ).rejects.toBeInstanceOf(DependencyGraphTooLargeException);
  });

  it('lanca CycleDetectionTimeoutException ao estourar 2s', async () => {
    const slowTx: MockTx = {
      workItem: {
        findMany: jest.fn(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve([{ id: 'never' }]),
                CYCLE_DETECTOR_TIMEOUT_MS + 200,
              ),
            ),
        ),
      },
    };

    await expect(
      service.detectCycle({
        fromId: 'from',
        toId: 'to',
        tx: slowTx as never,
      }),
    ).rejects.toBeInstanceOf(CycleDetectionTimeoutException);
  }, 10000);
});
