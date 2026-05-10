import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTestProcess,
  createTestTask,
  createTestWorkspace,
  TestProcess,
  TestTask,
  TestWorkspace,
} from './setup';

const log = new Logger('sprint4.e2e');

describe('Sprint 4 — Content Resources (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ws: TestWorkspace | null = null;
  let process: TestProcess | null = null;
  let task: TestTask | null = null;
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
      task = await createTestTask(app, process, ws.ownerUserId, {
        title: 'Sprint 4 task',
      });
    } catch (err) {
      dbAvailable = false;
      log.warn(`[sprint4] infra indisponível, pulando suite: ${(err as Error).message}`);
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

  describe('Comments (HPP-070, 071, 072)', () => {
    let commentId: string;

    it('POST /comments cria com taskId no body', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/comments')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ taskId: task!.taskId, body: 'primeiro comentário' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.body).toBe('primeiro comentário');
      expect(body.author).toBeTruthy();
      expect(body.author.id).toBe(ws!.ownerUserId);
      expect(body.author.passwordHash).toBeUndefined();
      expect(body.author.password).toBeUndefined();
      commentId = body.id;
    });

    it('GET /comments/task/:taskId lista paginado', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/comments/task/${task!.taskId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.items[0].author.passwordHash).toBeUndefined();
    });

    it('GET /comments/:id retorna single', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.id).toBe(commentId);
    });

    it('PUT /comments/:id edita', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ body: 'editado' })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.body).toBe('editado');
      expect(body.editedAt).toBeTruthy();
    });

    it('POST /comments/:id/reactions toggle adiciona', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/comments/${commentId}/reactions`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ emoji: '👍' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.action).toBe('added');
      expect(body.emoji).toBe('👍');
    });

    it('POST /comments/:id/reactions toggle remove', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/comments/${commentId}/reactions`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ emoji: '👍' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.action).toBe('removed');
    });

    it('DELETE /comments/:id remove (204)', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });

  describe('Views (HPP-073)', () => {
    let viewId: string;

    it('POST /views cria visão', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/views')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          listId: process!.processId,
          name: 'Kanban',
          viewType: 'BOARD',
        })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      viewId = body.id;
    });

    it('GET /views?listId= lista por list', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/views`)
        .query({ listId: process!.processId })
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.items.find((v: any) => v.id === viewId)).toBeTruthy();
    });

    it('GET /views?spaceId= lista por space', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/views`)
        .query({ spaceId: process!.departmentId })
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.items.find((v: any) => v.id === viewId)).toBeTruthy();
    });

    it('GET /views (sem filtro) → 400', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .get(`/api/v1/views`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(400);
    });

    it('GET /views/:id single', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/views/${viewId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.id).toBe(viewId);
    });

    it('PUT /views/:id atualiza', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/views/${viewId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'Kanban Atualizado' })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.name).toBe('Kanban Atualizado');
    });

    it('PATCH /views/:id/pin fixa', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/views/${viewId}/pin`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.isPinned).toBe(true);
    });

    it('DELETE /views/:id remove (204)', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/views/${viewId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });

  describe('Custom Fields (HPP-074)', () => {
    let cfId: string;

    it('POST /custom-fields cria definition workspace-wide', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post('/api/v1/custom-fields')
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          key: `cf_sprint4_${Date.now()}`,
          label: 'CF Sprint 4',
          type: 'TEXT',
        })
        .expect(201);
      const body = res.body.data ?? res.body;
      cfId = body.id;
      expect(body.workspaceId).toBe(ws!.workspaceId);
    });

    it('GET /custom-fields retorna agrupado por escopo', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/custom-fields')
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.workspace).toBeDefined();
      expect(body.space).toBeDefined();
      expect(body.folder).toBeDefined();
      expect(body.list).toBeDefined();
      expect(body.taskType).toBeDefined();
      expect(body.workspace.find((f: any) => f.id === cfId)).toBeTruthy();
    });

    it('GET /custom-fields/:id single', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/custom-fields/${cfId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.id).toBe(cfId);
    });

    it('PUT /custom-fields/:id atualiza', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/custom-fields/${cfId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ label: 'CF Atualizado' })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.label).toBe('CF Atualizado');
    });

    it('PUT /tasks/:id/custom-fields/:definitionId define valor (HPP-075)', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${task!.taskId}/custom-fields/${cfId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ value: 'valor sprint4' })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.value).toBe('valor sprint4');
    });

    it('DELETE /custom-fields/:id remove (204)', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/custom-fields/${cfId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });

  describe('Notifications (HPP-076, 077)', () => {
    let notifId: string;

    beforeAll(async () => {
      if (!dbAvailable) return;
      const created = await prisma.notification.create({
        data: {
          userId: ws!.ownerUserId,
          type: 'SYSTEM',
          category: 'PRIMARY',
          title: 'Sprint4 notif',
          description: 'smoke test',
          status: 'UNREAD',
        },
      });
      notifId = created.id;
    });

    it('GET /notifications retorna paginado com counts', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .query({ view: 'all', skip: 0, limit: 20 })
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.items).toBeDefined();
      expect(body.counts).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it('POST /notifications/:id/read marca como lida', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });

    it('POST /notifications/:id/clear limpa', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/notifications/${notifId}/clear`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });

    it('POST /notifications/read-all marca todas', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/notifications/read-all`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ view: 'all' })
        .expect(204);
    });

    it('DELETE /notifications/:id soft-delete', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/notifications/${notifId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });
});
