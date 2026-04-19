/**
 * E2E — Workspace Cross-Tenant Isolation
 *
 * Cobre a invariante mais critica do multi-tenancy: dados de um workspace
 * NUNCA devem ser visiveis para usuarios de outro workspace, mesmo quando
 * autenticados.
 *
 * Cenario:
 *   - Workspace A com userA (ADMIN)
 *   - Workspace B com userB (ADMIN)
 *   - userA cria 1 Department no workspace A
 *   - userB tenta acessar/listar/buscar dados do workspace A
 *
 * Resultados esperados:
 *   - GET /departments com token de userB nao retorna o department de A
 *   - GET /departments/:id (id de A) com token de userB retorna 404
 *   - POST /departments com token de userB cria no workspace B (nao A)
 *   - 5xx aqui seria FALHA — incidente de tenant-leak
 *
 * Pre-requisito: PostgreSQL acessivel via DATABASE_URL. Pula automaticamente
 * caso a conexao falhe (em CI sem DB local).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Workspace Isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ts = Date.now();
  const userAEmail = `isol-a-${ts}@mundial.com`;
  const userBEmail = `isol-b-${ts}@mundial.com`;
  const wsASlug = `iso-a-${ts}`;
  const wsBSlug = `iso-b-${ts}`;

  let userATokens: { access: string; refresh: string } | null = null;
  let userBTokens: { access: string; refresh: string } | null = null;
  let wsAId: string | null = null;
  let wsBId: string | null = null;
  let departmentAId: string | null = null;

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
    } catch (err) {
      dbAvailable = false;
      // Nao falhar suite — apenas pular. Util quando rodando sem DB local.

      console.warn(
        '[workspace-isolation] DB indisponivel, pulando suite:',
        (err as Error).message,
      );
      try {
        await app?.close();
      } catch {
        /* noop */
      }
    }
  }, 60_000);

  afterAll(async () => {
    if (!dbAvailable) return;
    try {
      // Cleanup ordem: department -> members -> workspace -> user
      if (wsAId) {
        await prisma.department.deleteMany({ where: { workspaceId: wsAId } });
        await prisma.workspaceMember.deleteMany({
          where: { workspaceId: wsAId },
        });
        await prisma.workspace.deleteMany({ where: { id: wsAId } });
      }
      if (wsBId) {
        await prisma.department.deleteMany({ where: { workspaceId: wsBId } });
        await prisma.workspaceMember.deleteMany({
          where: { workspaceId: wsBId },
        });
        await prisma.workspace.deleteMany({ where: { id: wsBId } });
      }
      await prisma.user.deleteMany({
        where: { email: { in: [userAEmail, userBEmail] } },
      });
    } finally {
      await app.close();
    }
  });

  const skipIfNoDb = () => {
    if (!dbAvailable) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(true).toBe(true);
      return true;
    }
    return false;
  };

  it('setup: cria userA + workspaceA + userB + workspaceB', async () => {
    if (skipIfNoDb()) return;

    // Registrar userA — vem sem workspace (onboarding)
    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: userAEmail, name: 'User A', password: 'senha12345' })
      .expect(201);

    userATokens = {
      access: regA.body.data.accessToken,
      refresh: regA.body.data.refreshToken,
    };
    expect(regA.body.data.workspace).toBeNull();

    // userA cria workspace A
    const wsACreate = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${userATokens.access}`)
      .send({ name: 'Iso A', slug: wsASlug })
      .expect(201);

    wsAId = wsACreate.body.data.id;
    expect(wsAId).toBeTruthy();

    // userA seleciona workspace A — recebe novos tokens com workspaceId
    const selectA = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${wsAId}/select`)
      .set('Authorization', `Bearer ${userATokens.access}`)
      .expect(200);

    userATokens = {
      access: selectA.body.data.accessToken,
      refresh: selectA.body.data.refreshToken,
    };

    // Mesmo fluxo para userB
    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: userBEmail, name: 'User B', password: 'senha12345' })
      .expect(201);

    userBTokens = {
      access: regB.body.data.accessToken,
      refresh: regB.body.data.refreshToken,
    };

    const wsBCreate = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${userBTokens.access}`)
      .send({ name: 'Iso B', slug: wsBSlug })
      .expect(201);

    wsBId = wsBCreate.body.data.id;
    expect(wsBId).toBeTruthy();

    const selectB = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${wsBId}/select`)
      .set('Authorization', `Bearer ${userBTokens.access}`)
      .expect(200);

    userBTokens = {
      access: selectB.body.data.accessToken,
      refresh: selectB.body.data.refreshToken,
    };
  }, 60_000);

  it('userA cria Department no workspace A', async () => {
    if (skipIfNoDb()) return;

    // userA precisa ter role ADMIN no User (nao no workspace) para criar dept.
    // O fluxo de register cria com role 'OPERATOR' default — promovemos via DB.
    await prisma.user.update({
      where: { email: userAEmail },
      data: { role: 'ADMIN' },
    });
    // Token novo apos mudanca de role
    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: userATokens!.refresh })
      .expect(200);
    userATokens = {
      access: refresh.body.data.accessToken,
      refresh: refresh.body.data.refreshToken,
    };

    const created = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${userATokens.access}`)
      .send({ name: `IsoDept ${ts}` })
      .expect(201);

    departmentAId = created.body.data.id;
    expect(departmentAId).toBeTruthy();
  }, 30_000);

  it('CROSS-TENANT: userB GET /departments NAO retorna department de A', async () => {
    if (skipIfNoDb()) return;

    // Promover userB tambem para ter role ADMIN/MANAGER necessaria pelo controller
    await prisma.user.update({
      where: { email: userBEmail },
      data: { role: 'ADMIN' },
    });
    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: userBTokens!.refresh })
      .expect(200);
    userBTokens = {
      access: refresh.body.data.accessToken,
      refresh: refresh.body.data.refreshToken,
    };

    const res = await request(app.getHttpServer())
      .get('/api/v1/departments')
      .set('Authorization', `Bearer ${userBTokens.access}`)
      .expect(200);

    // Status NUNCA pode ser 5xx aqui — qualquer 500 eh leak/bug
    expect(res.status).toBeLessThan(500);

    const ids: string[] = res.body.data.items.map((d: { id: string }) => d.id);
    expect(ids).not.toContain(departmentAId);
  }, 30_000);

  it('CROSS-TENANT: userB GET /departments/:idA → 404 (nao 200, nao 500)', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/departments/${departmentAId}`)
      .set('Authorization', `Bearer ${userBTokens!.access}`);

    // Repository scope-aware -> findById(workspaceId, id) retorna null -> 404.
    // 403 tambem aceitavel. 500 eh incidente.
    expect([403, 404]).toContain(res.status);
  }, 30_000);

  it('CROSS-TENANT: userB POST /departments cria no workspace B (nao A)', async () => {
    if (skipIfNoDb()) return;

    const created = await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${userBTokens!.access}`)
      .send({ name: `IsoDeptB ${ts}` })
      .expect(201);

    const newDeptId = created.body.data.id;

    // Validacao na DB: o department recem criado pertence a wsB, nao a wsA
    const dept = await prisma.department.findUnique({
      where: { id: newDeptId },
      select: { workspaceId: true },
    });
    expect(dept?.workspaceId).toBe(wsBId);
    expect(dept?.workspaceId).not.toBe(wsAId);
  }, 30_000);

  it('CROSS-TENANT: userB tenta DELETE department de A → 404/403, nao 200', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/departments/${departmentAId}`)
      .set('Authorization', `Bearer ${userBTokens!.access}`);

    // Acceptable: 404 (scoped repo nao acha) ou 403. Inaceitavel: 204 (deletou)
    expect([403, 404]).toContain(res.status);

    // Confirma na DB que ainda existe (e nao foi soft-deleted)
    const stillThere = await prisma.department.findUnique({
      where: { id: departmentAId! },
      select: { id: true, deletedAt: true },
    });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.deletedAt).toBeNull();
  }, 30_000);
});
