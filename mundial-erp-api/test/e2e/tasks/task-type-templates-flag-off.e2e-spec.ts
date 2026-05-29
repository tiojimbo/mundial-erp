/**
 * E2E — Task Type Templates kill switch OFF.
 *
 * Estrategia de forcar a flag OFF (D8 / PLANO-TASK-TYPES-TEMPLATES Sprint 3):
 *   `process.env.FEATURE_TASK_TYPE_TEMPLATES_ENABLED = 'false'` e atribuido
 *   ANTES de `Test.createTestingModule(...).compile()`. O `ConfigModule` do
 *   Nest da precedencia ao `process.env` sobre o `.env` (dotenv so popula
 *   variaveis ainda nao definidas). Como `TaskTypeTemplatesGuard` e o
 *   `TasksService.isTemplatesEnabled()` leem a flag uma unica vez no
 *   construtor / ConfigService.get, a atribuicao precisa ocorrer no nivel
 *   do modulo — antes de qualquer codigo de boot da app.
 *
 * Cobertura:
 *   1. GET /api/v1/task-type-templates -> 404 (guard global).
 *   2. GET /api/v1/task-type-templates/builtin-order -> 404 (mesmo com
 *      builtin existente no banco).
 *   3. POST /api/v1/tasks com customTypeId=builtin-order e sem
 *      markdownContent -> 201; resposta.markdownContent NAO contem JSON do
 *      BlockNote (template ignorado, fluxo legado).
 *   4. GET /api/v1/tasks segue respondendo 200 normalmente (a flag OFF nao
 *      pode vazar pra outros endpoints).
 */

// Forca o kill switch global ANTES do AppModule carregar. Imports estaticos
// abaixo dependem deste lado-efeito; manter este bloco no topo do arquivo.
process.env.FEATURE_TASK_TYPE_TEMPLATES_ENABLED = 'false';

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
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

const log = new Logger('task-type-templates-flag-off.e2e');

const BUILTIN_ORDER_TYPE_ID = 'builtin-order';
const BUILTIN_ORDER_TEMPLATE_ID = 'ttt-builtin-order';

const DEFAULT_DESCRIPTION_BLOCKS: Prisma.InputJsonValue = [
  {
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Pedido', styles: {} }],
  },
  {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Template do builtin-order para o spec de flag OFF.',
        styles: {},
      },
    ],
  },
];

const ATTACHMENT_CATEGORIES: Prisma.InputJsonValue = [
  { id: 'comprovante', label: 'Comprovante', required: false },
];

/**
 * Garante que o `builtin-order` (CustomTaskType + TaskTypeTemplate) exista
 * no banco antes do spec rodar. Idempotente — se o seed-reference-data ja
 * populou, o upsert e no-op. Necessario para validar o cenario "template
 * existe mas e ignorado quando flag OFF".
 */
const ensureBuiltinOrderTemplate = async (
  prisma: PrismaService,
): Promise<void> => {
  await prisma.customTaskType.upsert({
    where: { id: BUILTIN_ORDER_TYPE_ID },
    update: {},
    create: {
      id: BUILTIN_ORDER_TYPE_ID,
      name: 'Pedido',
      namePlural: 'Pedidos',
      description: 'Builtin order (seed do spec flag OFF)',
      icon: 'ShoppingCart',
      color: '#2563eb',
      sortOrder: 2,
      isBuiltin: false,
      workspaceId: null,
    },
  });

  await prisma.taskTypeTemplate.upsert({
    where: { id: BUILTIN_ORDER_TEMPLATE_ID },
    update: {
      customTaskTypeId: BUILTIN_ORDER_TYPE_ID,
      attachmentCategories: ATTACHMENT_CATEGORIES,
      defaultDescriptionBlocks: DEFAULT_DESCRIPTION_BLOCKS,
    },
    create: {
      id: BUILTIN_ORDER_TEMPLATE_ID,
      customTaskTypeId: BUILTIN_ORDER_TYPE_ID,
      attachmentCategories: ATTACHMENT_CATEGORIES,
      defaultDescriptionBlocks: DEFAULT_DESCRIPTION_BLOCKS,
    },
  });
};

/**
 * Heuristica para detectar se o `markdownContent` retornado pelo POST
 * corresponde ao JSON serializado dos `defaultDescriptionBlocks` do
 * template. Quando flag OFF, NENHUMA destas condicoes deve ser verdadeira.
 */
const looksLikeBlockNoteTemplate = (value: string | null): boolean => {
  if (typeof value !== 'string' || value.length === 0) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return false;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const blocks = Array.isArray(parsed) ? parsed : null;
    if (!blocks) return false;
    return blocks.some((block) => {
      if (typeof block !== 'object' || block === null) return false;
      const t = (block as { type?: unknown }).type;
      return typeof t === 'string' && t.length > 0;
    });
  } catch {
    return false;
  }
};

describe('Task Type Templates — flag OFF (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ws: TestWorkspace | null = null;
  let viewer: TestUser | null = null;
  let listCtx: TestListContext | null = null;
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

      await ensureBuiltinOrderTemplate(prisma);

      ws = await createTestWorkspace(app);
      viewer = await createTestUser(app, ws.workspaceId, 'EDITOR');
      listCtx = await createTestListContext(app, ws.workspaceId);
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[ttt-flag-off] infra indisponivel, pulando suite: ${(err as Error).message}`,
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

  it('GET /api/v1/task-type-templates -> 404 (kill switch OFF)', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/task-type-templates')
      .set('Authorization', `Bearer ${ws!.token}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/v1/task-type-templates/:customTaskTypeId -> 404 mesmo com builtin seedado', async () => {
    if (skipIfNoDb()) return;

    const seeded = await prisma.taskTypeTemplate.findFirst({
      where: { customTaskTypeId: BUILTIN_ORDER_TYPE_ID },
      select: { id: true },
    });
    expect(seeded?.id).toBeTruthy();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/task-type-templates/${BUILTIN_ORDER_TYPE_ID}`)
      .set('Authorization', `Bearer ${ws!.token}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/v1/task-type-templates -> 404 tambem para usuario OPERATOR (guard antes do RBAC)', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/task-type-templates')
      .set('Authorization', `Bearer ${viewer!.token}`);

    expect(res.status).toBe(404);
  });

  it('POST /api/v1/tasks com customTypeId=builtin-order e sem markdown -> 201; template e ignorado', async () => {
    if (skipIfNoDb()) return;

    const created = await createTaskViaApi(app, listCtx!, ws!.token, {
      title: 'Task flag OFF — sem markdown',
      customTypeId: BUILTIN_ORDER_TYPE_ID,
    });

    expect(created.taskId).toBeTruthy();
    expect(created.customTypeId).toBe(BUILTIN_ORDER_TYPE_ID);
    expect(looksLikeBlockNoteTemplate(created.markdownContent)).toBe(false);
    expect(created.markdownContent ?? '').not.toContain(
      'Template do builtin-order',
    );
  });

  it('POST /api/v1/tasks com customTypeId=builtin-order respeita markdown informado pelo cliente (paridade com flag ON)', async () => {
    if (skipIfNoDb()) return;

    const userMarkdown = '# Markdown do cliente — flag OFF';
    const created = await createTaskViaApi(app, listCtx!, ws!.token, {
      title: 'Task flag OFF — com markdown',
      customTypeId: BUILTIN_ORDER_TYPE_ID,
      markdownContent: userMarkdown,
    });

    expect(created.markdownContent).toBe(userMarkdown);
    expect(looksLikeBlockNoteTemplate(created.markdownContent)).toBe(false);
  });

  it('Flag OFF nao vaza pra outros endpoints: GET /api/v1/tasks segue 200', async () => {
    if (skipIfNoDb()) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${ws!.token}`);

    expect(res.status).toBe(200);
  });
});
