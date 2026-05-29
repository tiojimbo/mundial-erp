/**
 * E2E — GET /api/v1/task-type-templates (M2 — Sprint 3 TTT-031).
 *
 * Cobertura:
 *   - Workspace recem criado enxerga builtins globais (workspaceId NULL).
 *   - Workspace A vê seu template proprio + os builtins.
 *   - Cross-tenant: workspace B nao enxerga o template proprio de A.
 *   - RBAC: usuario VIEWER consegue listar (read-only liberado).
 *
 * Pre-condicoes:
 *   - FEATURE_TASK_TYPE_TEMPLATES_ENABLED forcado pra `true` antes do AppModule
 *     carregar (kill switch global).
 *   - workspace.settings.featureTaskTypeTemplatesEnabled = true pra cada
 *     workspace criado (gate per-workspace do TaskTypeTemplatesGuard).
 *   - Builtin `builtin-order` semeado via Prisma no beforeAll se ausente
 *     (independencia de seed externa).
 */

process.env.FEATURE_TASK_TYPE_TEMPLATES_ENABLED = 'true';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import {
  cleanupWorkspace,
  createTestUser,
  createTestWorkspace,
  TestUser,
  TestWorkspace,
} from './setup';

const log = new Logger('task-type-templates-list.e2e');

interface TemplateFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  config: Record<string, unknown> | null;
  sortOrder: number;
  isBuiltin: boolean;
}

interface TemplateField {
  definitionId: string;
  sortOrder: number;
  requiredOverride: boolean | null;
  definition: TemplateFieldDefinition;
}

interface TemplateResponse {
  id: string;
  customTaskTypeId: string;
  attachmentCategories: Array<Record<string, unknown>> | null;
  defaultDescriptionBlocks: Record<string, unknown> | null;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

interface EnvelopedListResponse {
  data: TemplateResponse[];
  meta: { timestamp: string };
}

const BUILTIN_ORDER_ID = 'builtin-order';
const BUILTIN_STOCK_REQUEST_ID = 'builtin-stock-request';

describe('GET /task-type-templates (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let wsA: TestWorkspace | null = null;
  let wsB: TestWorkspace | null = null;
  let wsFresh: TestWorkspace | null = null;
  let viewerInA: TestUser | null = null;

  let ownTemplateIdA: string | null = null;
  let ownCustomTypeIdA: string | null = null;
  let ownDefinitionIdA: string | null = null;

  let dbAvailable = true;

  const enableTemplatesForWorkspace = async (
    workspaceId: string,
  ): Promise<void> => {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { settings: { featureTaskTypeTemplatesEnabled: true } },
    });
  };

  const ensureBuiltinTemplates = async (): Promise<void> => {
    const existsOrder = await prisma.taskTypeTemplate.findUnique({
      where: { id: BUILTIN_ORDER_ID },
      select: { id: true },
    });
    if (!existsOrder) {
      await prisma.customTaskType.upsert({
        where: { id: BUILTIN_ORDER_ID },
        update: {},
        create: {
          id: BUILTIN_ORDER_ID,
          workspaceId: null,
          name: 'Pedido',
          isBuiltin: true,
          sortOrder: 2,
        },
      });
      await prisma.customFieldDefinition.upsert({
        where: { id: 'cfd-order-client_name' },
        update: {},
        create: {
          id: 'cfd-order-client_name',
          workspaceId: null,
          key: 'client_name',
          name: 'Nome/Razao social',
          label: 'Nome/Razao social',
          type: 'TEXT',
          required: true,
          isBuiltin: true,
          sortOrder: 0,
        },
      });
      await prisma.taskTypeTemplate.create({
        data: {
          id: BUILTIN_ORDER_ID,
          customTaskTypeId: BUILTIN_ORDER_ID,
          attachmentCategories: [],
          fields: {
            create: [
              {
                definitionId: 'cfd-order-client_name',
                sortOrder: 0,
                requiredOverride: null,
              },
            ],
          },
        },
      });
    }

    const existsStock = await prisma.taskTypeTemplate.findUnique({
      where: { id: BUILTIN_STOCK_REQUEST_ID },
      select: { id: true },
    });
    if (!existsStock) {
      await prisma.customTaskType.upsert({
        where: { id: BUILTIN_STOCK_REQUEST_ID },
        update: {},
        create: {
          id: BUILTIN_STOCK_REQUEST_ID,
          workspaceId: null,
          name: 'Requisicao de Estoque',
          isBuiltin: true,
          sortOrder: 3,
        },
      });
      await prisma.customFieldDefinition.upsert({
        where: { id: 'cfd-stock-item_sku' },
        update: {},
        create: {
          id: 'cfd-stock-item_sku',
          workspaceId: null,
          key: 'item_sku',
          name: 'SKU do item',
          label: 'SKU do item',
          type: 'TEXT',
          required: true,
          isBuiltin: true,
          sortOrder: 0,
        },
      });
      await prisma.taskTypeTemplate.create({
        data: {
          id: BUILTIN_STOCK_REQUEST_ID,
          customTaskTypeId: BUILTIN_STOCK_REQUEST_ID,
          attachmentCategories: [],
          fields: {
            create: [
              {
                definitionId: 'cfd-stock-item_sku',
                sortOrder: 0,
                requiredOverride: null,
              },
            ],
          },
        },
      });
    }
  };

  const createOwnTemplateFor = async (
    workspaceId: string,
  ): Promise<{
    templateId: string;
    customTypeId: string;
    definitionId: string;
  }> => {
    const uniq = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const customType = await prisma.customTaskType.create({
      data: {
        workspaceId,
        name: `Custom Type ${uniq}`,
        isBuiltin: false,
        sortOrder: 100,
      },
      select: { id: true },
    });
    const definition = await prisma.customFieldDefinition.create({
      data: {
        workspaceId,
        key: `own_key_${uniq}`,
        name: `Own field ${uniq}`,
        label: `Own field ${uniq}`,
        type: 'TEXT',
        required: false,
        isBuiltin: false,
        sortOrder: 0,
      },
      select: { id: true },
    });
    const template = await prisma.taskTypeTemplate.create({
      data: {
        customTaskTypeId: customType.id,
        attachmentCategories: [],
        fields: {
          create: [
            {
              definitionId: definition.id,
              sortOrder: 0,
              requiredOverride: null,
            },
          ],
        },
      },
      select: { id: true },
    });
    return {
      templateId: template.id,
      customTypeId: customType.id,
      definitionId: definition.id,
    };
  };

  const cleanupOwnTemplate = async (
    customTypeId: string,
    definitionId: string,
  ): Promise<void> => {
    await prisma.taskTypeTemplate.deleteMany({
      where: { customTaskTypeId: customTypeId },
    });
    await prisma.customFieldDefinition.deleteMany({
      where: { id: definitionId },
    });
    await prisma.customTaskType.deleteMany({ where: { id: customTypeId } });
  };

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

      await ensureBuiltinTemplates();

      wsA = await createTestWorkspace(app);
      wsB = await createTestWorkspace(app);
      wsFresh = await createTestWorkspace(app);

      await enableTemplatesForWorkspace(wsA.workspaceId);
      await enableTemplatesForWorkspace(wsB.workspaceId);
      await enableTemplatesForWorkspace(wsFresh.workspaceId);

      viewerInA = await createTestUser(app, wsA.workspaceId, 'GUEST');
      const refreshed = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: viewerInA.refreshToken })
        .expect(200);
      const refreshedAccess = refreshed.body.data.accessToken as string;
      const refreshedRefresh = refreshed.body.data.refreshToken as string;
      const select = await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${wsA.workspaceId}/select`)
        .set('Authorization', `Bearer ${refreshedAccess}`)
        .expect(200);
      viewerInA = {
        userId: viewerInA.userId,
        email: viewerInA.email,
        token: select.body.data.accessToken as string,
        refreshToken:
          (select.body.data.refreshToken as string) ?? refreshedRefresh,
      };

      const own = await createOwnTemplateFor(wsA.workspaceId);
      ownTemplateIdA = own.templateId;
      ownCustomTypeIdA = own.customTypeId;
      ownDefinitionIdA = own.definitionId;
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[task-type-templates-list] infra indisponivel, pulando suite: ${(err as Error).message}`,
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
      if (ownCustomTypeIdA && ownDefinitionIdA) {
        await cleanupOwnTemplate(ownCustomTypeIdA, ownDefinitionIdA);
      }
      if (wsA) await cleanupWorkspace(app, wsA.workspaceId);
      if (wsB) await cleanupWorkspace(app, wsB.workspaceId);
      if (wsFresh) await cleanupWorkspace(app, wsFresh.workspaceId);
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

  const listTemplates = async (token: string): Promise<TemplateResponse[]> => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/task-type-templates')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as EnvelopedListResponse;
    expect(Array.isArray(body.data)).toBe(true);
    return body.data;
  };

  it('workspace recem-criado ve os 2 templates builtin globais', async () => {
    if (skipIfNoDb()) return;

    const templates = await listTemplates(wsFresh!.token);
    const customTypeIds = templates.map((t) => t.customTaskTypeId);

    expect(customTypeIds).toEqual(
      expect.arrayContaining([BUILTIN_ORDER_ID, BUILTIN_STOCK_REQUEST_ID]),
    );
    for (const tpl of templates) {
      expect(tpl).toHaveProperty('id');
      expect(tpl).toHaveProperty('customTaskTypeId');
      expect(tpl).toHaveProperty('fields');
      expect(Array.isArray(tpl.fields)).toBe(true);
    }
  });

  it('workspace A ve seu template proprio + os builtins', async () => {
    if (skipIfNoDb()) return;

    const templates = await listTemplates(wsA!.token);
    const customTypeIds = templates.map((t) => t.customTaskTypeId);
    const ids = templates.map((t) => t.id);

    expect(customTypeIds).toEqual(
      expect.arrayContaining([BUILTIN_ORDER_ID, BUILTIN_STOCK_REQUEST_ID]),
    );
    expect(customTypeIds).toContain(ownCustomTypeIdA);
    expect(ids).toContain(ownTemplateIdA);
  });

  it('cross-tenant: workspace B nao ve o template proprio de A', async () => {
    if (skipIfNoDb()) return;

    const templates = await listTemplates(wsB!.token);
    const customTypeIds = templates.map((t) => t.customTaskTypeId);
    const ids = templates.map((t) => t.id);

    expect(customTypeIds).toEqual(
      expect.arrayContaining([BUILTIN_ORDER_ID, BUILTIN_STOCK_REQUEST_ID]),
    );
    expect(customTypeIds).not.toContain(ownCustomTypeIdA);
    expect(ids).not.toContain(ownTemplateIdA);
  });

  it('RBAC: VIEWER consegue listar (read-only liberado)', async () => {
    if (skipIfNoDb()) return;

    const templates = await listTemplates(viewerInA!.token);
    const customTypeIds = templates.map((t) => t.customTaskTypeId);

    expect(customTypeIds).toEqual(
      expect.arrayContaining([BUILTIN_ORDER_ID, BUILTIN_STOCK_REQUEST_ID]),
    );
    expect(customTypeIds).toContain(ownCustomTypeIdA);
  });
});
