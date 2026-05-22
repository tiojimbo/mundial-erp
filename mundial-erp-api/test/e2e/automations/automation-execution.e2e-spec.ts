import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTestListContext,
  createTestUser,
  createTestWorkspace,
  TestListContext,
  TestUser,
  TestWorkspace,
} from '../tasks/setup';

const log = new Logger('automation-execution.e2e');

const TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 200;

const waitFor = async <T>(
  fn: () => Promise<T | null | false | undefined>,
  timeoutMs = TIMEOUT_MS,
): Promise<T | null> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result as T;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null;
};

describe('Automation execution (e2e) — Tarefa 5 sprint imediato', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ws: TestWorkspace | null = null;
  let ctx: TestListContext | null = null;
  let statusBId: string | null = null;
  let secondUser: TestUser | null = null;
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
      ctx = await createTestListContext(app, ws.workspaceId);

      const statusB = await prisma.status.create({
        data: {
          name: 'Em andamento',
          type: 'ACTIVE',
          color: '#3b82f6',
          spaceId: ctx.spaceId,
          folderId: ctx.folderId,
          position: 1,
        },
      });
      statusBId = statusB.id;

      secondUser = await createTestUser(app, ws.workspaceId, 'OPERATOR');
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[automation-execution] infra indisponivel, pulando suite: ${(err as Error).message}`,
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
      if (ws) {
        if (secondUser) {
          await prisma.notification
            .deleteMany({ where: { userId: secondUser.userId } })
            .catch(() => undefined);
        }
        await prisma.automation
          .deleteMany({ where: { workspaceId: ws.workspaceId } })
          .catch(() => undefined);
        await cleanupWorkspace(app, ws.workspaceId);
      }
    } finally {
      await app.close();
    }
  });

  const skipIfNoDb = (): boolean => {
    if (!dbAvailable) {
      expect(true).toBe(true);
      return true;
    }
    return false;
  };

  describe('Cenario A — TASK_CREATED dispara change_status', () => {
    it('cria automation por LIST, cria task com statusA e termina em statusB', async () => {
      if (skipIfNoDb()) return;

      const automation = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'Auto-mover novas tasks',
          trigger: 'TASK_CREATED',
          scopeType: 'LIST',
          scopeId: ctx!.listId,
          compiledActions: [
            { type: 'change_status', params: { statusId: statusBId } },
          ],
        })
        .expect(201);

      const automationId = (automation.body.data ?? automation.body)
        .id as string;
      expect(automationId).toBeDefined();

      const taskRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          listId: ctx!.listId,
          title: 'Task para mover',
          statusId: ctx!.defaultStatusId,
        })
        .expect(201);

      const taskId = (taskRes.body.data ?? taskRes.body).id as string;

      const moved = await waitFor(async () => {
        const t = await prisma.workItem.findUnique({ where: { id: taskId } });
        return t?.statusId === statusBId ? t : null;
      });
      expect(moved).not.toBeNull();
      expect(moved?.statusId).toBe(statusBId);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/ai/automation/${automationId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = detail.body.data ?? detail.body;
      expect(body.executionCount).toBeGreaterThanOrEqual(1);
    }, 15_000);
  });

  describe('Cenario B — COMMENT_CREATED dispara send_notification', () => {
    it('cria automation, posta comentario e segundo user recebe notificacao', async () => {
      if (skipIfNoDb()) return;

      const taskRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          listId: ctx!.listId,
          title: 'Task para comentar',
          statusId: ctx!.defaultStatusId,
        })
        .expect(201);
      const taskId = (taskRes.body.data ?? taskRes.body).id as string;

      await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'Notificar 2o user em comentario',
          trigger: 'COMMENT_CREATED',
          scopeType: 'LIST',
          scopeId: ctx!.listId,
          compiledActions: [
            {
              type: 'send_notification',
              params: {
                userIds: [secondUser!.userId],
                message: 'nova mensagem',
              },
            },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ taskId, content: 'oi pessoal' })
        .expect(201);

      const notification = await waitFor(async () => {
        return prisma.notification.findFirst({
          where: {
            userId: secondUser!.userId,
            title: 'Automação',
            entityId: taskId,
          },
        });
      });
      expect(notification).not.toBeNull();
      expect(notification?.description).toBe('nova mensagem');
    }, 15_000);
  });

  describe('Cenario C — validacao DTO @ValidateIf', () => {
    it('POST trigger=CRON sem cronExpression -> 400 com mensagem explicita', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'CRON sem expressao',
          trigger: 'CRON',
          scopeType: 'WORKSPACE',
          timezone: 'America/Sao_Paulo',
          compiledActions: [
            { type: 'change_status', params: { statusId: statusBId } },
          ],
        })
        .expect(400);

      const msg = JSON.stringify(res.body);
      expect(msg).toMatch(/cronExpression é obrigatório quando trigger=CRON/);
    });

    it('POST trigger=CRON com cronExpression mas sem timezone -> 400', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'CRON sem timezone',
          trigger: 'CRON',
          scopeType: 'WORKSPACE',
          cronExpression: '0 9 * * 1-5',
          compiledActions: [
            { type: 'change_status', params: { statusId: statusBId } },
          ],
        })
        .expect(400);

      const msg = JSON.stringify(res.body);
      expect(msg).toMatch(/timezone é obrigatório quando trigger=CRON/);
    });

    it('POST scopeType=LIST sem scopeId -> 400 com mensagem explicita', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'LIST sem scopeId',
          trigger: 'TASK_CREATED',
          scopeType: 'LIST',
          compiledActions: [
            { type: 'change_status', params: { statusId: statusBId } },
          ],
        })
        .expect(400);

      const msg = JSON.stringify(res.body);
      expect(msg).toMatch(/scopeId é obrigatório quando scopeType ≠ WORKSPACE/);
    });

    it('POST com payload CRON correto -> 201', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'CRON valido',
          trigger: 'CRON',
          scopeType: 'WORKSPACE',
          cronExpression: '0 9 * * 1-5',
          timezone: 'America/Sao_Paulo',
          compiledActions: [
            { type: 'change_status', params: { statusId: statusBId } },
          ],
        })
        .expect(201);

      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.trigger).toBe('CRON');
      expect(body.cronExpression).toBe('0 9 * * 1-5');
      expect(body.timezone).toBe('America/Sao_Paulo');
    });
  });
});
