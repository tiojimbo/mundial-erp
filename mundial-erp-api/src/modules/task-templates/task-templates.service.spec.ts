/**
 * Unit tests — TaskTemplatesService (Sprint 6).
 *
 * Cobertura:
 *   1. create valida ≤ 200 nodes (defense-in-depth).
 *   2. Snapshot reconstroi payload recursivo ate depth 3.
 *   3. Instantiate cria hierarquia + dedup de tags (nameLower).
 *   4. Cross-tenant retorna 404 (findOne/update/remove/snapshot/instantiate).
 *   5. Falha dentro de instantiate faz rollback da transacao.
 *   6. Ids sao sempre regerados (template.payload nao contem ids antigos e o
 *      service confia no default `cuid()` do Prisma).
 *
 * Os tests mockam `PrismaService`, `TaskOutboxService` e `TaskTemplatesRepository`
 * — zero dependencia de DB/Redis/rede. Rodavel hoje.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskTemplatesService } from './task-templates.service';
import { TaskTemplatesRepository } from './task-templates.repository';
import { TEMPLATE_MAX_NODES } from './pipes/template-payload.validator';

type AnyFn = (...args: unknown[]) => unknown;

interface MockTx {
  workItem: {
    create: jest.Mock;
  };
  workItemChecklist: {
    create: jest.Mock;
  };
  workItemChecklistItem: {
    create: jest.Mock;
  };
  workItemTagLink: {
    create: jest.Mock;
  };
}

interface MockPrisma {
  $transaction: jest.Mock;
}

interface MockRepo {
  findMany: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  softDelete: jest.Mock;
  findProcessInWorkspace: jest.Mock;
  findDefaultStatusForProcess: jest.Mock;
  findTaskForSnapshot: jest.Mock;
  upsertTagByName: jest.Mock;
  findWithPayload?: jest.Mock;
}

interface MockOutbox {
  enqueue: jest.Mock;
}

function makeTx(): MockTx {
  let workItemCounter = 0;
  let checklistCounter = 0;
  let itemCounter = 0;
  const tx: MockTx = {
    workItem: {
      create: jest.fn(async () => ({ id: `wi-${++workItemCounter}` })),
    },
    workItemChecklist: {
      create: jest.fn(async () => ({ id: `cl-${++checklistCounter}` })),
    },
    workItemChecklistItem: {
      create: jest.fn(async () => ({ id: `ci-${++itemCounter}` })),
    },
    workItemTagLink: {
      create: jest.fn(async () => ({ workItemId: 'wi-link' })),
    },
  };
  return tx;
}

function buildHarness(opts?: { txFactory?: () => MockTx }): {
  service: TaskTemplatesService;
  prisma: MockPrisma;
  repo: MockRepo;
  outbox: MockOutbox;
  tx: MockTx;
} {
  const tx = (opts?.txFactory ?? makeTx)();
  const prisma: MockPrisma = {
    $transaction: jest.fn(async (cb: AnyFn) => cb(tx)),
  };
  const repo: MockRepo = {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findProcessInWorkspace: jest.fn(),
    findDefaultStatusForProcess: jest.fn(),
    findTaskForSnapshot: jest.fn(),
    upsertTagByName: jest.fn(),
  };
  const outbox: MockOutbox = { enqueue: jest.fn(async () => 'event-1') };
  const service = new TaskTemplatesService(
    prisma as unknown as ConstructorParameters<typeof TaskTemplatesService>[0],
    repo as unknown as TaskTemplatesRepository,
    outbox as unknown as ConstructorParameters<typeof TaskTemplatesService>[2],
  );
  return { service, prisma, repo, outbox, tx };
}

function baseEntity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tpl-1',
    workspaceId: 'ws-1',
    name: 'T',
    scope: 'WORKSPACE' as const,
    departmentId: null,
    processId: null,
    payload: { title: 'root' },
    subtaskCount: 0,
    checklistCount: 0,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('TaskTemplatesService', () => {
  describe('create — denorm + node cap', () => {
    it('calcula subtaskCount e checklistCount a partir do payload', async () => {
      const { service, repo } = buildHarness();
      repo.create.mockResolvedValue(
        baseEntity({ subtaskCount: 2, checklistCount: 1 }),
      );

      await service.create(
        'ws-1',
        {
          name: 'Tpl',
          payload: {
            title: 'root',
            checklists: [{ name: 'cl', items: [] }],
            subtasks: [{ title: 's1' }, { title: 's2' }],
          },
        },
        'user-1',
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          name: 'Tpl',
          subtaskCount: 2,
          checklistCount: 1,
        }),
      );
    });

    it('rejeita payload com mais de TEMPLATE_MAX_NODES nodes', async () => {
      const { service } = buildHarness();
      // 201 subtasks contam 1 (root) + 201 = 202 nodes (> 200).
      const subtasks = Array.from(
        { length: TEMPLATE_MAX_NODES + 1 },
        (_, i) => ({
          title: `s${i}`,
        }),
      );
      await expect(
        service.create(
          'ws-1',
          { name: 'Big', payload: { title: 'root', subtasks } },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('scope DEPARTMENT sem departmentId -> 400', async () => {
      const { service } = buildHarness();
      await expect(
        service.create(
          'ws-1',
          {
            name: 'X',
            scope: 'DEPARTMENT' as never,
            payload: { title: 'root' },
          },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('snapshot — reconstrucao recursiva depth 3', () => {
    it('monta payload espelhando subtree e grava via repository.update', async () => {
      const { service, repo } = buildHarness();
      repo.findById.mockResolvedValue(baseEntity());
      repo.findTaskForSnapshot.mockResolvedValue({
        id: 'root',
        title: 'Root Title',
        description: 'desc',
        markdownContent: '# md',
        priority: 'HIGH',
        estimatedMinutes: 30,
        checklists: [
          {
            id: 'cl-a',
            name: 'QA',
            items: [
              { id: 'i-1', name: 'item 1', parentId: null, position: 0 },
              { id: 'i-2', name: 'item 2', parentId: 'i-1', position: 1 },
            ],
          },
        ],
        tags: [
          { tag: { id: 't1', name: 'Frontend' } },
          { tag: { id: 't2', name: 'Urgent' } },
        ],
        children: [
          {
            id: 'c1',
            title: 'Level 2',
            description: null,
            markdownContent: null,
            priority: 'NONE',
            estimatedMinutes: null,
            checklists: [],
            tags: [],
            children: [
              {
                id: 'c1-1',
                title: 'Level 3',
                description: null,
                markdownContent: null,
                priority: 'NONE',
                estimatedMinutes: null,
                checklists: [],
                tags: [],
                children: [],
              },
            ],
          },
        ],
      });
      repo.update.mockImplementation(async (_ws, _id, data) =>
        baseEntity({
          payload: data.payload,
          subtaskCount: data.subtaskCount,
          checklistCount: data.checklistCount,
        }),
      );

      await service.snapshot('ws-1', 'tpl-1', { fromTaskId: 'root' }, 'user-1');

      const updateCall = repo.update.mock.calls[0];
      const payload = updateCall[2].payload as Record<string, unknown>;
      expect(payload.title).toBe('Root Title');
      expect(payload.priority).toBe('HIGH');
      expect(payload.tags).toEqual(['Frontend', 'Urgent']);
      expect(Array.isArray(payload.subtasks)).toBe(true);
      const level2 = (payload.subtasks as Array<Record<string, unknown>>)[0];
      expect(level2.title).toBe('Level 2');
      const level3 = (level2.subtasks as Array<Record<string, unknown>>)[0];
      expect(level3.title).toBe('Level 3');
      // `id` do task original NAO deve aparecer no payload (ids regerados ao
      // instantiate) — o snapshot so pega metadados.
      expect(payload).not.toHaveProperty('id');
    });

    it('snapshot cross-tenant (template inexistente) -> 404', async () => {
      const { service, repo } = buildHarness();
      repo.findById.mockResolvedValue(null);
      await expect(
        service.snapshot('ws-1', 'tpl-x', { fromTaskId: 't' }, 'u'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('snapshot cross-tenant (task inexistente) -> 404', async () => {
      const { service, repo } = buildHarness();
      repo.findById.mockResolvedValue(baseEntity());
      repo.findTaskForSnapshot.mockResolvedValue(null);
      await expect(
        service.snapshot('ws-1', 'tpl-1', { fromTaskId: 't' }, 'u'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('instantiate — hierarquia + dedup de tags', () => {
    it('cria root + 2 subtasks + 1 checklist + items, dedup tags', async () => {
      const { service, repo, prisma, tx, outbox } = buildHarness();
      repo.findById.mockResolvedValue(
        baseEntity({
          payload: {
            title: 'Root',
            priority: 'HIGH',
            tags: ['Frontend', 'frontend'], // dedup via nameLower
            checklists: [
              { name: 'QA', items: [{ name: 'item 1' }, { name: 'item 2' }] },
            ],
            subtasks: [
              {
                title: 'Sub A',
                tags: ['Backend'],
              },
              {
                title: 'Sub B',
                tags: ['Frontend'], // reuse cache
              },
            ],
          },
        }),
      );
      repo.findProcessInWorkspace.mockResolvedValue({
        id: 'proc-1',
        departmentId: 'dep-1',
      });
      repo.findDefaultStatusForProcess.mockResolvedValue({ id: 'status-ns' });

      let tagCounter = 0;
      repo.upsertTagByName.mockImplementation(async (_ws, name) => {
        const key = (name as string).trim().toLowerCase();
        const byKey: Record<string, { id: string; created: boolean }> = {
          frontend: { id: 'tag-fe', created: true },
          backend: { id: 'tag-be', created: true },
        };
        tagCounter += 1;
        return byKey[key] ?? { id: `tag-${tagCounter}`, created: true };
      });

      const result = await service.instantiate(
        'ws-1',
        'proc-1',
        'tpl-1',
        {},
        'user-1',
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // 1 root + 2 subtasks = 3 WorkItems criados.
      expect(tx.workItem.create).toHaveBeenCalledTimes(3);
      expect(tx.workItemChecklist.create).toHaveBeenCalledTimes(1);
      expect(tx.workItemChecklistItem.create).toHaveBeenCalledTimes(2);

      // Checklist items vem com source=TEMPLATE.
      expect(tx.workItemChecklistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'TEMPLATE' }),
        }),
      );

      // Dedup tags: frontend uma vez, backend uma vez.
      const tagCalls = repo.upsertTagByName.mock.calls.map((c) => c[1]);
      // Frontend aparece 2x no root (Frontend + frontend) e 1x na subtask B.
      // Por dedup no cache do service, apenas 1 upsert de frontend acontece.
      expect(
        tagCalls.filter((n) => String(n).toLowerCase() === 'frontend').length,
      ).toBe(1);
      expect(
        tagCalls.filter((n) => String(n).toLowerCase() === 'backend').length,
      ).toBe(1);

      // 3 tagLinks: root (fe), subA (be), subB (fe).
      expect(tx.workItemTagLink.create).toHaveBeenCalledTimes(3);

      // 1 evento SUBTASK_ADDED por filho direto da raiz = 2 eventos.
      expect(outbox.enqueue).toHaveBeenCalledTimes(2);
      expect(outbox.enqueue).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ eventType: 'SUBTASK_ADDED' }),
      );

      expect(result.rootTaskId).toBe('wi-1');
      expect(result.nodesCreated).toBe(3);
      expect(result.checklistsCreated).toBe(1);
      expect(result.tagsCreated).toBe(2);
    });

    it('usa statusId informado no DTO quando presente', async () => {
      const { service, repo, tx } = buildHarness();
      repo.findById.mockResolvedValue(baseEntity({ payload: { title: 'R' } }));
      repo.findProcessInWorkspace.mockResolvedValue({
        id: 'p',
        departmentId: 'd',
      });

      await service.instantiate(
        'ws-1',
        'p',
        'tpl-1',
        { statusId: 'custom-status' },
        'u',
      );

      expect(repo.findDefaultStatusForProcess).not.toHaveBeenCalled();
      const firstCall = tx.workItem.create.mock.calls[0][0] as {
        data: { statusId: string };
      };
      expect(firstCall.data.statusId).toBe('custom-status');
    });

    it('cross-tenant: template em outro ws -> 404', async () => {
      const { service, repo } = buildHarness();
      repo.findById.mockResolvedValue(null);
      await expect(
        service.instantiate('ws-1', 'p', 'tpl-x', {}, 'u'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cross-tenant: process em outro ws -> 404', async () => {
      const { service, repo } = buildHarness();
      repo.findById.mockResolvedValue(baseEntity());
      repo.findProcessInWorkspace.mockResolvedValue(null);
      await expect(
        service.instantiate('ws-1', 'p-x', 'tpl-1', {}, 'u'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sem statusId informado e sem default -> 400', async () => {
      const { service, repo } = buildHarness();
      repo.findById.mockResolvedValue(baseEntity());
      repo.findProcessInWorkspace.mockResolvedValue({
        id: 'p',
        departmentId: 'd',
      });
      repo.findDefaultStatusForProcess.mockResolvedValue(null);
      await expect(
        service.instantiate('ws-1', 'p', 'tpl-1', {}, 'u'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('falha interna faz rollback (tx rejeita, service propaga)', async () => {
      const { service, repo, prisma, tx } = buildHarness();
      repo.findById.mockResolvedValue(
        baseEntity({
          payload: {
            title: 'Root',
            subtasks: [{ title: 'S1' }, { title: 'S2-fail' }],
          },
        }),
      );
      repo.findProcessInWorkspace.mockResolvedValue({
        id: 'p',
        departmentId: 'd',
      });
      repo.findDefaultStatusForProcess.mockResolvedValue({ id: 'status' });

      // Segundo create (subtask 2) falha -> tx roda o callback e throw
      // propaga. Nossa mock $transaction executa o cb e repassa a rejeicao,
      // simulando o rollback real do Prisma.
      let calls = 0;
      tx.workItem.create.mockImplementation(async () => {
        calls += 1;
        if (calls === 3) {
          throw new Error('DB boom');
        }
        return { id: `wi-${calls}` };
      });

      await expect(
        service.instantiate('ws-1', 'p', 'tpl-1', {}, 'u'),
      ).rejects.toThrow('DB boom');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('ids sao sempre regerados (payload sem `id` -> tx.create sem id explicito)', async () => {
      const { service, repo, tx } = buildHarness();
      repo.findById.mockResolvedValue(
        baseEntity({
          payload: {
            title: 'Root',
            subtasks: [{ title: 'Child' }],
          },
        }),
      );
      repo.findProcessInWorkspace.mockResolvedValue({
        id: 'p',
        departmentId: 'd',
      });
      repo.findDefaultStatusForProcess.mockResolvedValue({ id: 'status' });

      await service.instantiate('ws-1', 'p', 'tpl-1', {}, 'u');

      for (const call of tx.workItem.create.mock.calls) {
        const arg = call[0] as { data: Record<string, unknown> };
        expect(arg.data).not.toHaveProperty('id');
      }
    });
  });

  describe('findOne / update / remove — cross-tenant 404', () => {
    it.each(['findOne', 'update', 'remove'] as const)(
      '%s em template inexistente lanca NotFoundException',
      async (method) => {
        const { service, repo } = buildHarness();
        repo.findById.mockResolvedValue(null);

        const invoke = (): Promise<unknown> => {
          if (method === 'findOne') return service.findOne('ws-1', 'x');
          if (method === 'update')
            return service.update('ws-1', 'x', { name: 'new' } as never, 'u');
          return service.remove('ws-1', 'x', 'u');
        };

        await expect(invoke()).rejects.toBeInstanceOf(NotFoundException);
      },
    );
  });
});
