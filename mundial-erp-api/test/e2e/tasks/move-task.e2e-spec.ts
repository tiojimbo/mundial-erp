/**
 * E2E — Mover task entre lists com remapeamento de status (paridade Hoppe).
 *
 * Cobre o contrato GET /tasks/move-preview + PUT /tasks/move-to-list:
 *   1. Status com equivalente de type no destino -> auto-map, sem reconciliacao.
 *   2. Status sem equivalente -> needsReconciliation; commit sem mapping = 400;
 *      commit com mapping manual = 200.
 *   3. Subtasks movem junto com a parent.
 *
 * Tolera ausencia de infra (dbAvailable) seguindo o padrao dos specs do modulo.
 */

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StatusType } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTaskViaApi,
  createTestWorkspace,
  TestWorkspace,
} from './setup';

const log = new Logger('move-task.e2e');

const uniqueId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface ChainStatus {
  name: string;
  type: StatusType;
  position: number;
}

interface ListWithChain {
  listId: string;
  spaceId: string;
  statuses: { id: string; name: string; type: StatusType }[];
}

/**
 * Cria space + folder + list com `statusInheritance = SPACE` e a esteira de
 * status no nivel do space (folderId/listId null) — coerente com a resolucao
 * de esteira do move (resolveListStatusScope para SPACE).
 */
async function makeListWithChain(
  prisma: PrismaService,
  workspaceId: string,
  chain: ChainStatus[],
): Promise<ListWithChain> {
  const suffix = uniqueId('mv');
  const space = await prisma.space.create({
    data: { workspaceId, name: `Space ${suffix}`, slug: `space-${suffix}` },
  });
  const folder = await prisma.folder.create({
    data: { name: `Folder ${suffix}`, slug: `folder-${suffix}`, spaceId: space.id },
  });
  const list = await prisma.list.create({
    data: {
      name: `List ${suffix}`,
      slug: `list-${suffix}`,
      spaceId: space.id,
      folderId: folder.id,
      processType: 'LIST',
      status: 'ACTIVE',
      statusInheritance: 'SPACE',
    },
  });
  const statuses = [];
  for (const s of chain) {
    const created = await prisma.status.create({
      data: {
        name: s.name,
        type: s.type,
        color: '#94a3b8',
        spaceId: space.id,
        position: s.position,
      },
    });
    statuses.push({ id: created.id, name: created.name, type: created.type });
  }
  return { listId: list.id, spaceId: space.id, statuses };
}

const DEFAULT_CHAIN: ChainStatus[] = [
  { name: 'A Fazer', type: StatusType.NOT_STARTED, position: 0 },
  { name: 'Fazendo', type: StatusType.ACTIVE, position: 1 },
  { name: 'Feito', type: StatusType.DONE, position: 2 },
];

describe('Mover task entre lists (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ws: TestWorkspace | null = null;
  let dbAvailable = true;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1', {
        exclude: ['health', 'health/ready', 'docs'],
      });
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );
      await app.init();

      prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;

      ws = await createTestWorkspace(app);
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[move-task] infra indisponivel, pulando suite: ${(err as Error).message}`,
      );
      try {
        await app?.close();
      } catch {
        /* noop */
      }
    }
  }, 90_000);

  afterAll(async () => {
    if (!dbAvailable) return;
    try {
      if (ws) await cleanupWorkspace(app, ws.workspaceId);
    } finally {
      await app.close();
    }
  });

  const skipIfNoDb = (): boolean => {
    if (!dbAvailable) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(true).toBe(true);
      return true;
    }
    return false;
  };

  it('preview mapeia status por type quando ha equivalente (sem reconciliacao)', async () => {
    if (skipIfNoDb()) return;

    const x = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    const y = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    const task = await createTaskViaApi(app, { listId: x.listId }, ws!.token);

    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks/move-preview')
      .query({ taskIds: task.taskId, targetListId: y.listId })
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    const yNotStarted = y.statuses.find(
      (s) => s.type === StatusType.NOT_STARTED,
    )!;
    expect(res.body.needsReconciliation).toBe(false);
    expect(res.body.statusDiffs).toHaveLength(1);
    expect(res.body.statusDiffs[0].autoTargetStatusId).toBe(yNotStarted.id);
  });

  it('commit move e remapeia o status (auto)', async () => {
    if (skipIfNoDb()) return;

    const x = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    const y = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    const task = await createTaskViaApi(app, { listId: x.listId }, ws!.token);
    const yNotStarted = y.statuses.find(
      (s) => s.type === StatusType.NOT_STARTED,
    )!;
    const xNotStarted = x.statuses.find(
      (s) => s.type === StatusType.NOT_STARTED,
    )!;

    const res = await request(app.getHttpServer())
      .put('/api/v1/tasks/move-to-list')
      .set('Authorization', `Bearer ${ws!.token}`)
      .send({
        targetListId: y.listId,
        taskIds: [task.taskId],
        statusMapping: [
          {
            sourceStatusId: xNotStarted.id,
            targetStatusId: yNotStarted.id,
          },
        ],
      })
      .expect(200);

    expect(res.body.moved).toBe(1);
    const moved = await prisma.workItem.findUnique({
      where: { id: task.taskId },
      select: { listId: true, statusId: true },
    });
    expect(moved?.listId).toBe(y.listId);
    expect(moved?.statusId).toBe(yNotStarted.id);
  });

  it('status sem equivalente: preview pede reconciliacao e commit sem mapping da 400', async () => {
    if (skipIfNoDb()) return;

    const x = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    // Destino so com NOT_STARTED — sem equivalente para CLOSED.
    const y = await makeListWithChain(prisma, ws!.workspaceId, [
      { name: 'Backlog', type: StatusType.NOT_STARTED, position: 0 },
    ]);
    const task = await createTaskViaApi(app, { listId: x.listId }, ws!.token);

    // Move a task para um status CLOSED na origem.
    const xClosed = await prisma.status.create({
      data: {
        name: 'Finalizado',
        type: StatusType.CLOSED,
        color: '#94a3b8',
        spaceId: x.spaceId,
        position: 3,
      },
    });
    await prisma.workItem.update({
      where: { id: task.taskId },
      data: { statusId: xClosed.id },
    });

    const preview = await request(app.getHttpServer())
      .get('/api/v1/tasks/move-preview')
      .query({ taskIds: task.taskId, targetListId: y.listId })
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    expect(preview.body.needsReconciliation).toBe(true);
    expect(preview.body.statusDiffs[0].autoTargetStatusId).toBeNull();

    await request(app.getHttpServer())
      .put('/api/v1/tasks/move-to-list')
      .set('Authorization', `Bearer ${ws!.token}`)
      .send({ targetListId: y.listId, taskIds: [task.taskId], statusMapping: [] })
      .expect(400);

    const yBacklog = y.statuses[0];
    const ok = await request(app.getHttpServer())
      .put('/api/v1/tasks/move-to-list')
      .set('Authorization', `Bearer ${ws!.token}`)
      .send({
        targetListId: y.listId,
        taskIds: [task.taskId],
        statusMapping: [
          { sourceStatusId: xClosed.id, targetStatusId: yBacklog.id },
        ],
      })
      .expect(200);

    expect(ok.body.moved).toBe(1);
    const moved = await prisma.workItem.findUnique({
      where: { id: task.taskId },
      select: { listId: true, statusId: true },
    });
    expect(moved?.listId).toBe(y.listId);
    expect(moved?.statusId).toBe(yBacklog.id);
  });

  it('subtask move junto com a parent', async () => {
    if (skipIfNoDb()) return;

    const x = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    const y = await makeListWithChain(prisma, ws!.workspaceId, DEFAULT_CHAIN);
    const parent = await createTaskViaApi(app, { listId: x.listId }, ws!.token);

    const subRes = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${ws!.token}`)
      .send({
        title: 'Subtask',
        listId: x.listId,
        parentId: parent.taskId,
      })
      .expect(201);
    const subId = subRes.body.id as string;

    const yNotStarted = y.statuses.find(
      (s) => s.type === StatusType.NOT_STARTED,
    )!;
    const xNotStarted = x.statuses.find(
      (s) => s.type === StatusType.NOT_STARTED,
    )!;

    const res = await request(app.getHttpServer())
      .put('/api/v1/tasks/move-to-list')
      .set('Authorization', `Bearer ${ws!.token}`)
      .send({
        targetListId: y.listId,
        taskIds: [parent.taskId],
        statusMapping: [
          { sourceStatusId: xNotStarted.id, targetStatusId: yNotStarted.id },
        ],
      })
      .expect(200);

    expect(res.body.moved).toBe(2);
    const sub = await prisma.workItem.findUnique({
      where: { id: subId },
      select: { listId: true },
    });
    expect(sub?.listId).toBe(y.listId);
  });
});
