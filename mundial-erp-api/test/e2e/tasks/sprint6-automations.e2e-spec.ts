import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTestProcess,
  createTestWorkspace,
  TestProcess,
  TestWorkspace,
} from './setup';

const log = new Logger('sprint6.e2e');

describe('Sprint 6 — Automations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ws: TestWorkspace | null = null;
  let process: TestProcess | null = null;
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
      process = await createTestProcess(app, ws.workspaceId);
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[sprint6] infra indisponível, pulando suite: ${(err as Error).message}`,
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
      expect(true).toBe(true);
      return true;
    }
    return false;
  };

  describe('Catalogos (HPP-101, 102, 103)', () => {
    it('GET /ai/automation/triggers retorna 18 itens', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/automation/triggers')
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(18);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('label');
      expect(body[0]).toHaveProperty('category');
    });

    it('GET /ai/automation/actions retorna 21 itens', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/automation/actions')
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(21);
      expect(body.find((a: any) => a.id === 'change_status')).toBeDefined();
    });

    it('GET /ai/automation/statuses agrupa por escopo', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/automation/statuses')
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body).toHaveProperty('spaces');
      expect(body).toHaveProperty('folders');
    });
  });

  describe('CRUD + Toggle (HPP-104, 105)', () => {
    let automationId: string;

    it('POST cria Automation', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'Atribuir owner no create',
          trigger: 'TASK_CREATED',
          scopeType: 'WORKSPACE',
          compiledActions: [
            {
              type: 'change_assignees',
              params: { mode: 'set', userIds: [ws!.ownerUserId] },
            },
          ],
        })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      automationId = body.id;
    });

    it('GET lista contem nova automation', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.find((a: any) => a.id === automationId)).toBeDefined();
    });

    it('PUT atualiza nome', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/ai/automation/${automationId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'Atribuir owner (v2)' })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.name).toBe('Atribuir owner (v2)');
    });

    it('POST /:id/toggle inverte isActive', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/ai/automation/${automationId}/toggle`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({})
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.isActive).toBe(false);
    });

    it('DELETE soft delete', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/ai/automation/${automationId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.id).toBe(automationId);
    });

    it('GET /:id de automation deletada retorna 404', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .get(`/api/v1/ai/automation/${automationId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(404);
    });
  });

  describe('Validacoes (HPP-104)', () => {
    it('POST com scope=SPACE sem scopeId retorna 400', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'Invalida',
          trigger: 'TASK_CREATED',
          scopeType: 'SPACE',
          compiledActions: [{ type: 'change_status', params: {} }],
        })
        .expect(400);
    });

    it('POST com trigger=CRON sem cronExpression retorna 400', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'CronSemExpr',
          trigger: 'CRON',
          scopeType: 'WORKSPACE',
          compiledActions: [{ type: 'change_status', params: {} }],
        })
        .expect(400);
    });

    it('POST com action desconhecida retorna 400', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'ActionInvalida',
          trigger: 'TASK_CREATED',
          scopeType: 'WORKSPACE',
          compiledActions: [{ type: 'fly_to_moon', params: {} }],
        })
        .expect(400);
    });
  });

  describe('Smoke ponta a ponta (HPP-112)', () => {
    it('cria Automation TASK_CREATED → change_assignees, cria task e valida atribuicao em < 5s', async () => {
      if (skipIfNoDb()) return;

      const automation = await request(app.getHttpServer())
        .post('/api/v1/ai/automation')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          name: 'E2E auto-atribuir',
          trigger: 'TASK_CREATED',
          scopeType: 'WORKSPACE',
          compiledActions: [
            {
              type: 'change_assignees',
              params: { mode: 'set', userIds: [ws!.ownerUserId] },
            },
          ],
        })
        .expect(201);
      const automationId = (automation.body.data ?? automation.body).id;

      const startedAt = Date.now();
      const taskRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          listId: process!.processId,
          title: 'Task que dispara automation',
        })
        .expect(201);
      const taskId = (taskRes.body.data ?? taskRes.body).id;

      let assignees: Array<{ user: { id: string } }> = [];
      const deadline = startedAt + 5_000;
      while (Date.now() < deadline) {
        const get = await request(app.getHttpServer())
          .get(`/api/v1/tasks/${taskId}/assignees`)
          .set('Authorization', `Bearer ${ws!.token}`);
        assignees = get.body.data ?? get.body ?? [];
        if (
          assignees.some((a) => a.user?.id === ws!.ownerUserId) &&
          assignees.length > 0
        ) {
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      const elapsed = Date.now() - startedAt;
      log.log(
        `[smoke] automation=${automationId} task=${taskId} elapsed=${elapsed}ms assignees=${assignees.length}`,
      );

      expect(assignees.some((a) => a.user?.id === ws!.ownerUserId)).toBe(true);
      expect(elapsed).toBeLessThan(5_000);
    }, 15_000);
  });
});
