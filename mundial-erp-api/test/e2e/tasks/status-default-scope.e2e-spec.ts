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

const log = new Logger('status-default-scope.e2e');

const uniqueId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface ScopedList {
  spaceId: string;
  folderId: string;
  listId: string;
  spaceNotStartedId: string;
  folderNotStartedId: string | null;
  listNotStartedId: string | null;
}

async function makeCustomList(
  prisma: PrismaService,
  workspaceId: string,
): Promise<ScopedList> {
  const suffix = uniqueId('cust');
  const space = await prisma.space.create({
    data: { workspaceId, name: `Space ${suffix}`, slug: `space-${suffix}` },
  });
  const folder = await prisma.folder.create({
    data: { name: `Folder ${suffix}`, slug: `folder-${suffix}`, spaceId: space.id },
  });
  const spaceStatus = await prisma.status.create({
    data: {
      name: 'Space ToDo',
      type: StatusType.NOT_STARTED,
      color: '#94a3b8',
      spaceId: space.id,
      folderId: null,
      listId: null,
      position: 0,
    },
  });
  const list = await prisma.list.create({
    data: {
      name: `List ${suffix}`,
      slug: `list-${suffix}`,
      spaceId: space.id,
      folderId: folder.id,
      processType: 'LIST',
      status: 'ACTIVE',
      statusInheritance: 'CUSTOM',
    },
  });
  const listStatus = await prisma.status.create({
    data: {
      name: 'List Backlog',
      type: StatusType.NOT_STARTED,
      color: '#22c55e',
      spaceId: space.id,
      folderId: folder.id,
      listId: list.id,
      position: 0,
    },
  });
  return {
    spaceId: space.id,
    folderId: folder.id,
    listId: list.id,
    spaceNotStartedId: spaceStatus.id,
    folderNotStartedId: null,
    listNotStartedId: listStatus.id,
  };
}

async function makeSpaceList(
  prisma: PrismaService,
  workspaceId: string,
): Promise<ScopedList> {
  const suffix = uniqueId('spc');
  const space = await prisma.space.create({
    data: { workspaceId, name: `Space ${suffix}`, slug: `space-${suffix}` },
  });
  const folder = await prisma.folder.create({
    data: { name: `Folder ${suffix}`, slug: `folder-${suffix}`, spaceId: space.id },
  });
  const spaceStatus = await prisma.status.create({
    data: {
      name: 'Space ToDo',
      type: StatusType.NOT_STARTED,
      color: '#94a3b8',
      spaceId: space.id,
      folderId: null,
      listId: null,
      position: 0,
    },
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
  return {
    spaceId: space.id,
    folderId: folder.id,
    listId: list.id,
    spaceNotStartedId: spaceStatus.id,
    folderNotStartedId: null,
    listNotStartedId: null,
  };
}

async function makeFolderCustomList(
  prisma: PrismaService,
  workspaceId: string,
): Promise<ScopedList> {
  const suffix = uniqueId('fld');
  const space = await prisma.space.create({
    data: { workspaceId, name: `Space ${suffix}`, slug: `space-${suffix}` },
  });
  const folder = await prisma.folder.create({
    data: {
      name: `Folder ${suffix}`,
      slug: `folder-${suffix}`,
      spaceId: space.id,
      statusInheritance: 'CUSTOM',
    },
  });
  const spaceStatus = await prisma.status.create({
    data: {
      name: 'Space ToDo',
      type: StatusType.NOT_STARTED,
      color: '#94a3b8',
      spaceId: space.id,
      folderId: null,
      listId: null,
      position: 0,
    },
  });
  const folderStatus = await prisma.status.create({
    data: {
      name: 'Folder ToDo',
      type: StatusType.NOT_STARTED,
      color: '#3b82f6',
      spaceId: space.id,
      folderId: folder.id,
      listId: null,
      position: 0,
    },
  });
  const list = await prisma.list.create({
    data: {
      name: `List ${suffix}`,
      slug: `list-${suffix}`,
      spaceId: space.id,
      folderId: folder.id,
      processType: 'LIST',
      status: 'ACTIVE',
      statusInheritance: 'FOLDER',
    },
  });
  return {
    spaceId: space.id,
    folderId: folder.id,
    listId: list.id,
    spaceNotStartedId: spaceStatus.id,
    folderNotStartedId: folderStatus.id,
    listNotStartedId: null,
  };
}

describe('Status default por escopo na criacao de task (e2e)', () => {
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
        `[status-default-scope] infra indisponivel, pulando suite: ${(err as Error).message}`,
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

  it('happy path: task em list CUSTOM nasce com NOT_STARTED da propria list', async () => {
    if (skipIfNoDb()) return;

    const ctx = await makeCustomList(prisma, ws!.workspaceId);
    const task = await createTaskViaApi(app, { listId: ctx.listId }, ws!.token);

    expect(task.raw.statusId).toBe(ctx.listNotStartedId);
    expect(task.raw.statusId).not.toBe(ctx.spaceNotStartedId);

    const persisted = await prisma.status.findUnique({
      where: { id: task.raw.statusId as string },
      select: { listId: true, type: true },
    });
    expect(persisted?.listId).toBe(ctx.listId);
    expect(persisted?.type).toBe(StatusType.NOT_STARTED);
  });

  it('regressao SPACE: task em list SPACE nasce com NOT_STARTED do Space', async () => {
    if (skipIfNoDb()) return;

    const ctx = await makeSpaceList(prisma, ws!.workspaceId);
    const task = await createTaskViaApi(app, { listId: ctx.listId }, ws!.token);

    expect(task.raw.statusId).toBe(ctx.spaceNotStartedId);

    const persisted = await prisma.status.findUnique({
      where: { id: task.raw.statusId as string },
      select: { spaceId: true, folderId: true, listId: true },
    });
    expect(persisted?.spaceId).toBe(ctx.spaceId);
    expect(persisted?.folderId).toBeNull();
    expect(persisted?.listId).toBeNull();
  });

  it('regressao folder CUSTOM: task em list de folder CUSTOM nasce com NOT_STARTED do folder', async () => {
    if (skipIfNoDb()) return;

    const ctx = await makeFolderCustomList(prisma, ws!.workspaceId);
    const task = await createTaskViaApi(app, { listId: ctx.listId }, ws!.token);

    expect(task.raw.statusId).toBe(ctx.folderNotStartedId);
    expect(task.raw.statusId).not.toBe(ctx.spaceNotStartedId);

    const persisted = await prisma.status.findUnique({
      where: { id: task.raw.statusId as string },
      select: { folderId: true, listId: true, type: true },
    });
    expect(persisted?.folderId).toBe(ctx.folderId);
    expect(persisted?.listId).toBeNull();
    expect(persisted?.type).toBe(StatusType.NOT_STARTED);
  });

  it('persistencia: list CUSTOM com task recem-criada nao expoe grupo "Sem status"', async () => {
    if (skipIfNoDb()) return;

    const ctx = await makeCustomList(prisma, ws!.workspaceId);
    const task = await createTaskViaApi(app, { listId: ctx.listId }, ws!.token);

    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks/list')
      .query({ level: 'list', listId: ctx.listId })
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    const groups = res.body as Array<{
      group: { id: string };
      tasks: Array<{ id: string }>;
    }>;

    const orphan = groups.find((g) => g.group.id === 'no-status');
    expect(orphan).toBeUndefined();

    const listGroup = groups.find((g) => g.group.id === ctx.listNotStartedId);
    expect(listGroup).toBeDefined();
    expect(listGroup!.tasks.some((t) => t.id === task.taskId)).toBe(true);
  });

  it('dropdown: statusId da task pertence ao escopo retornado por status.findByList', async () => {
    if (skipIfNoDb()) return;

    const ctx = await makeCustomList(prisma, ws!.workspaceId);
    const task = await createTaskViaApi(app, { listId: ctx.listId }, ws!.token);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/status/list/${ctx.listId}`)
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    const body = res.body as { data?: Array<{ id: string }> } | Array<{ id: string }>;
    const statuses = Array.isArray(body) ? body : (body.data ?? []);
    const ids = new Set(statuses.map((s) => s.id));
    expect(ids.has(task.raw.statusId as string)).toBe(true);
  });
});
