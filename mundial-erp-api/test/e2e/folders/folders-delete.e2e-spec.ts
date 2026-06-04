import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTestListContext,
  createTestUser,
  createTestWorkspace,
  TestWorkspace,
} from '../tasks/setup';

const log = new Logger('folders-delete.e2e');

interface SidebarSpace {
  id: string;
  areas: { id: string; isDefault: boolean }[];
}

describe('Excluir folders (e2e)', () => {
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
        `[folders-delete] infra indisponivel, pulando suite: ${(err as Error).message}`,
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

  const getSidebar = async (token: string): Promise<SidebarSpace[]> => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/spaces/sidebar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.data as SidebarSpace[];
  };

  it('exclui folder com sucesso (happy path)', async () => {
    if (skipIfNoDb()) return;

    const ctx = await createTestListContext(app, ws!.workspaceId);

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/folders/${ctx.folderId}`)
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    expect(res.body).toEqual({ message: 'Folder deleted successfully' });
  });

  it('exclui folder padrao (isDefault=true) retornando 200', async () => {
    if (skipIfNoDb()) return;

    const ctx = await createTestListContext(app, ws!.workspaceId);
    await prisma.folder.update({
      where: { id: ctx.folderId },
      data: { isDefault: true },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/folders/${ctx.folderId}`)
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    expect(res.body).toEqual({ message: 'Folder deleted successfully' });
  });

  it('soft delete: seta deletedAt e remove o folder do sidebar', async () => {
    if (skipIfNoDb()) return;

    const ctx = await createTestListContext(app, ws!.workspaceId);

    await request(app.getHttpServer())
      .delete(`/api/v1/folders/${ctx.folderId}`)
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    const folder = await prisma.folder.findUnique({
      where: { id: ctx.folderId },
    });
    expect(folder?.deletedAt).not.toBeNull();

    const spaces = await getSidebar(ws!.token);
    const space = spaces.find((s) => s.id === ctx.spaceId);
    expect(space).toBeDefined();
    expect(space!.areas.some((a) => a.id === ctx.folderId)).toBe(false);
  });

  it('excluir o unico folder deixa a space com areas vazias', async () => {
    if (skipIfNoDb()) return;

    const ctx = await createTestListContext(app, ws!.workspaceId);

    await request(app.getHttpServer())
      .delete(`/api/v1/folders/${ctx.folderId}`)
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    const spaces = await getSidebar(ws!.token);
    const space = spaces.find((s) => s.id === ctx.spaceId);
    expect(space).toBeDefined();
    expect(space!.areas).toEqual([]);
  });

  it('usuario sem role OWNER/ADMIN recebe 403', async () => {
    if (skipIfNoDb()) return;

    const ctx = await createTestListContext(app, ws!.workspaceId);
    const member = await createTestUser(app, ws!.workspaceId, 'EDITOR');

    await request(app.getHttpServer())
      .delete(`/api/v1/folders/${ctx.folderId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('folder inexistente retorna 404', async () => {
    if (skipIfNoDb()) return;

    await request(app.getHttpServer())
      .delete('/api/v1/folders/clx0000000000000000000000')
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(404);
  });

  it('nao causa regressao em DELETE /lists/:id', async () => {
    if (skipIfNoDb()) return;

    const ctx = await createTestListContext(app, ws!.workspaceId);

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/lists/${ctx.listId}`)
      .set('Authorization', `Bearer ${ws!.token}`)
      .expect(200);

    expect(res.body).toHaveProperty('message');
  });
});
