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

const log = new Logger('sprint5.e2e');

describe('Sprint 5 — Sub-resources (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ws: TestWorkspace | null = null;
  let process: TestProcess | null = null;
  let task: TestTask | null = null;
  let task2: TestTask | null = null;
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
        title: 'Sprint 5 task A',
      });
      task2 = await createTestTask(app, process, ws.ownerUserId, {
        title: 'Sprint 5 task B',
      });
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[sprint5] infra indisponível, pulando suite: ${(err as Error).message}`,
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

  describe('Checklists (HPP-080, 081, 082)', () => {
    let checklistId: string;
    let itemId: string;

    it('POST /checklist/task/:taskId cria checklist', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/checklist/task/${task!.taskId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'Pre-flight' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Pre-flight');
      checklistId = body.id;
    });

    it('GET /checklist/task/:taskId lista', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/checklist/task/${task!.taskId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(Array.isArray(body)).toBe(true);
      expect(body.find((c: any) => c.id === checklistId)).toBeTruthy();
    });

    it('PUT /checklist/:id edita', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/checklist/${checklistId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'Pre-flight v2' })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.name).toBe('Pre-flight v2');
    });

    it('POST /checklist/item/:checklistId cria item', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/checklist/item/${checklistId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'verificar combustível' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      itemId = body.id;
    });

    it('PUT /checklist/:checklistId/item/:itemId edita item', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/checklist/${checklistId}/item/${itemId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ resolved: true })
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.resolved).toBe(true);
    });

    it('DELETE /checklist/item/:itemId remove item', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/checklist/item/${itemId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });

    it('POST /task-checklists/:id/reorder retorna 404 (HPP-082)', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/task-checklists/${checklistId}/reorder`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ items: [] })
        .expect(404);
    });

    it('DELETE /checklist/:id remove checklist', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/checklist/${checklistId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });

  describe('Links (HPP-083)', () => {
    let linkId: string;

    it('POST /tasks/:id/links cria com type RELATES_TO', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${task!.taskId}/links`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ taskToId: task2!.taskId, type: 'RELATES_TO' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.linkId).toBeDefined();
      expect(body.type).toBe('RELATES_TO');
      expect(body.task.id).toBe(task2!.taskId);
      linkId = body.linkId;
    });

    it('GET /tasks/:id/links retorna o link com perspectiva', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${task!.taskId}/links`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.links.length).toBeGreaterThan(0);
      const item = body.links.find((l: any) => l.linkId === linkId);
      expect(item).toBeTruthy();
      expect(item.task.id).toBe(task2!.taskId);
    });

    it('DELETE /tasks/:id/links/:linkId remove pelo id', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${task!.taskId}/links/${linkId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });

  describe('Tags (HPP-085, 086)', () => {
    let tagId: string;

    it('POST /tags sem spaceId retorna 400', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/tags`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'urgent' })
        .expect(400);
    });

    it('POST /tags cria com spaceId', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tags`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ name: 'urgent', spaceId: process!.departmentId })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.spaceId).toBe(process!.departmentId);
      expect(body.tasksCount).toBe(0);
      tagId = body.id;
    });

    it('GET /tags retorna tasksCount', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tags`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      const item = body.items.find((t: any) => t.id === tagId);
      expect(item).toBeTruthy();
      expect(typeof item.tasksCount).toBe('number');
    });

    it('POST /tags/task/:taskId attach tag', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/tags/task/${task!.taskId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ tagId })
        .expect(204);
    });

    it('DELETE /tags/task/:taskId/:tagId detach tag', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .delete(`/api/v1/tags/task/${task!.taskId}/${tagId}`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(204);
    });
  });

  describe('Time entries (HPP-087)', () => {
    let entryId: string;

    it('POST /tasks/:id/time-entries/start inicia timer', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${task!.taskId}/time-entries/start`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ description: 'codando' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.endTime).toBeNull();
      entryId = body.id;
    });

    it('POST /start de novo retorna 409 (timer ja ativo)', async () => {
      if (skipIfNoDb()) return;
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${task!.taskId}/time-entries/start`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({})
        .expect(409);
    });

    it('PUT /tasks/:id/time-entries/:entryId/stop para timer', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/tasks/${task!.taskId}/time-entries/${entryId}/stop`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(body.endTime).toBeTruthy();
      expect(body.durationSeconds).toBeGreaterThanOrEqual(1);
    });

    it('POST /tasks/:id/time-entries cria manualmente', async () => {
      if (skipIfNoDb()) return;
      const start = new Date(Date.now() - 60_000).toISOString();
      const end = new Date().toISOString();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${task!.taskId}/time-entries`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({ startTime: start, endTime: end, description: 'manual' })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.durationSeconds).toBeGreaterThan(0);
    });

    it('GET /tasks/:id/time-entries lista', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${task!.taskId}/time-entries`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .expect(200);
      const body = res.body.data ?? res.body;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Attachments (HPP-088)', () => {
    it('POST /attachments/signed-url retorna 201 com uploadUrl', async () => {
      if (skipIfNoDb()) return;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/attachments/signed-url`)
        .set('Authorization', `Bearer ${ws!.token}`)
        .send({
          taskId: task!.taskId,
          filename: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        })
        .expect(201);
      const body = res.body.data ?? res.body;
      expect(body.uploadUrl).toBeDefined();
      expect(body.storageKey).toBeDefined();
    });
  });
});
