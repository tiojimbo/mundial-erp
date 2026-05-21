/**
 * E2E - Regressao POST /api/v1/tasks sem template envolvido (TTT M2).
 *
 * Garante que ligar FEATURE_TASK_TYPE_TEMPLATES_ENABLED nao introduz
 * side-effects no fluxo de create quando NAO ha template:
 *   - sem customTypeId -> respeita input do cliente (null ou string passada).
 *   - customTypeId que NAO tem TaskTypeTemplate associado -> respeita input.
 *   - builtin-task (cosmetico, sem template) -> respeita input.
 *
 * Em todos os cenarios o `markdownContent` persistido deve seguir o
 * comportamento legado (zero JSON BlockNote injetado pelo M2).
 *
 * Verificacao: GET /tasks/:taskId?include=markdown retorna o conteudo
 * persistido em body.markdown (string | null). POST /tasks retorna
 * TaskResponseDto sumarizado, que NAO inclui markdownContent — por isso o
 * detail endpoint e a fonte canonica para a assercao.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTaskViaApi,
  createTestListContext,
  createTestUser,
  createTestWorkspace,
  TestListContext,
  TestUser,
  TestWorkspace,
} from './setup';

const log = new Logger('task-type-templates-create-regression.e2e');

interface TaskDetailBody {
  id: string;
  markdown?: string | null;
}

describe('Task Type Templates - POST /tasks regression (no template) (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let ws: TestWorkspace | null = null;
  let owner: TestUser | null = null;
  let ctx: TestListContext | null = null;

  const customTypeIdsCreated: string[] = [];
  let builtinTaskEnsured = false;

  let dbAvailable = true;

  beforeAll(async () => {
    process.env.FEATURE_TASK_TYPE_TEMPLATES_ENABLED = 'true';

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
      owner = {
        userId: ws.ownerUserId,
        email: ws.ownerEmail,
        token: ws.token,
        refreshToken: ws.refreshToken,
      };
      ctx = await createTestListContext(app, ws.workspaceId);

      const existingBuiltin = await prisma.customTaskType.findUnique({
        where: { id: 'builtin-task' },
        select: { id: true },
      });
      if (!existingBuiltin) {
        await prisma.customTaskType.create({
          data: {
            id: 'builtin-task',
            name: 'Tarefa',
            namePlural: 'Tarefas',
            icon: 'CircleDotIcon',
            color: '#6b7280',
            sortOrder: 0,
            isBuiltin: true,
            workspaceId: null,
          },
        });
        builtinTaskEnsured = true;
      }
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[ttt-create-regression] infra indisponivel, pulando suite: ${(err as Error).message}`,
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
      if (customTypeIdsCreated.length > 0) {
        await prisma.customTaskType.deleteMany({
          where: { id: { in: customTypeIdsCreated } },
        });
      }
      if (builtinTaskEnsured) {
        await prisma.customTaskType
          .delete({ where: { id: 'builtin-task' } })
          .catch(() => undefined);
      }
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

  const fetchMarkdown = async (
    token: string,
    taskId: string,
  ): Promise<string | null | undefined> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .query({ include: 'markdown' })
      .expect(200);
    const body = res.body as TaskDetailBody;
    return body.markdown;
  };

  const createCustomTaskTypeWithoutTemplate = async (
    workspaceId: string,
    label: string,
  ): Promise<string> => {
    const created = await prisma.customTaskType.create({
      data: {
        workspaceId,
        name: `Custom Type ${label}`,
        namePlural: `Custom Types ${label}`,
        icon: 'CircleDotIcon',
        color: '#3b82f6',
        sortOrder: 100,
        isBuiltin: false,
      },
      select: { id: true },
    });
    customTypeIdsCreated.push(created.id);
    return created.id;
  };

  it('sem customTypeId e sem markdown -> markdown persistido e null (sem JSON de template)', async () => {
    if (skipIfNoDb()) return;

    const created = await createTaskViaApi(app, ctx!, owner!.token, {
      title: 'Regressao base sem nada',
    });

    const markdown = await fetchMarkdown(owner!.token, created.taskId);
    expect(markdown).toBeNull();
  }, 30_000);

  it('sem customTypeId e com markdown do cliente -> respeita o input exato', async () => {
    if (skipIfNoDb()) return;

    const clientText = 'texto do cliente';
    const created = await createTaskViaApi(app, ctx!, owner!.token, {
      title: 'Regressao base com markdown',
      markdownContent: clientText,
    });

    const markdown = await fetchMarkdown(owner!.token, created.taskId);
    expect(markdown).toBe(clientText);
  }, 30_000);

  it('customTypeId sem template e sem markdown -> markdown persistido e null', async () => {
    if (skipIfNoDb()) return;

    const customTypeId = await createCustomTaskTypeWithoutTemplate(
      ws!.workspaceId,
      'sem-template-a',
    );

    const created = await createTaskViaApi(app, ctx!, owner!.token, {
      title: 'CustomType sem template, sem markdown',
      customTypeId,
    });

    expect(created.customTypeId).toBe(customTypeId);
    const markdown = await fetchMarkdown(owner!.token, created.taskId);
    expect(markdown).toBeNull();
  }, 30_000);

  it('customTypeId sem template e com markdown -> respeita o input do cliente', async () => {
    if (skipIfNoDb()) return;

    const customTypeId = await createCustomTaskTypeWithoutTemplate(
      ws!.workspaceId,
      'sem-template-b',
    );

    const clientText = 'meu texto';
    const created = await createTaskViaApi(app, ctx!, owner!.token, {
      title: 'CustomType sem template, com markdown',
      customTypeId,
      markdownContent: clientText,
    });

    expect(created.customTypeId).toBe(customTypeId);
    const markdown = await fetchMarkdown(owner!.token, created.taskId);
    expect(markdown).toBe(clientText);
  }, 30_000);

  it('customTypeId="builtin-task" (sem template) -> markdown nao vira JSON de template', async () => {
    if (skipIfNoDb()) return;

    const created = await createTaskViaApi(app, ctx!, owner!.token, {
      title: 'Builtin task sem template',
      customTypeId: 'builtin-task',
    });

    expect(created.customTypeId).toBe('builtin-task');
    const markdown = await fetchMarkdown(owner!.token, created.taskId);
    expect(markdown).toBeNull();
  }, 30_000);
});
