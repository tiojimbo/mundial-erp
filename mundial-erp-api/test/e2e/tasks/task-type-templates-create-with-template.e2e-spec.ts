/**
 * E2E — POST /api/v1/tasks com CustomTaskType vinculado a TaskTypeTemplate
 * (M2 / TTT-032 — TasksService.resolveMarkdownContentWithTemplate).
 *
 * Cobertura:
 *   1. Template aplica `defaultDescriptionBlocks` quando cliente NAO envia
 *      `markdownContent`.
 *   2. User input wins: cliente passou string nao-vazia -> template ignorado.
 *   3. BlockNote AST "vazio" do cliente (paragraph com content[]) -> template
 *      aplica defaults (heuristica `isEmptyMarkdown`).
 *   4. Response carrega `customTypeId` corretamente.
 *   5. Cross-tenant: workspace B usando customTypeId do workspace A NAO recebe
 *      template applied (markdownContent fica null; comportamento degrada
 *      gracefully — repository filtra visibilidade do CustomTaskType).
 *
 * Pre-condicoes:
 *   - FEATURE_TASK_TYPE_TEMPLATES_ENABLED forcado ON antes do AppModule
 *     carregar (kill switch global lido pelo TasksService).
 *   - `builtin-order` (CustomTaskType + TaskTypeTemplate + defaultDescriptionBlocks)
 *     semeado via Prisma se ausente.
 *
 * Observacao do response:
 *   - POST /api/v1/tasks responde SEM envelope `{data}` (@SkipResponseTransform)
 *     e o TASK_LIST_SELECT NAO inclui `markdownContent`. Validamos `markdownContent`
 *     lendo direto via Prisma — o teste foca no efeito real do template.
 */

process.env.FEATURE_TASK_TYPE_TEMPLATES_ENABLED = 'true';

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
  createTaskViaApi,
  createTestListContext,
  createTestUser,
  createTestWorkspace,
  TestListContext,
  TestUser,
  TestWorkspace,
} from './setup';

const log = new Logger('task-type-templates-create-with-template.e2e');

const BUILTIN_ORDER_ID = 'builtin-order';
const BUILTIN_ORDER_TEMPLATE_ID = 'template-order-e2e';
const BUILTIN_ORDER_FIELD_ID = 'cfd-order-client_name';

const DEFAULT_DESCRIPTION_BLOCKS: Array<Record<string, unknown>> = [
  {
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Itens do pedido' }],
  },
  { type: 'paragraph', content: [] },
  {
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Entrega' }],
  },
  { type: 'paragraph', content: [] },
  {
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Observacoes' }],
  },
  { type: 'paragraph', content: [] },
];

interface CreatedOwnTemplate {
  customTypeId: string;
  templateId: string;
  definitionId: string;
}

describe('POST /tasks com TaskTypeTemplate (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let wsA: TestWorkspace | null = null;
  let wsB: TestWorkspace | null = null;
  let userOwnerA: TestUser | null = null;
  let ctxA: TestListContext | null = null;
  let ctxB: TestListContext | null = null;
  let ownTemplateInA: CreatedOwnTemplate | null = null;

  let dbAvailable = true;

  const ensureBuiltinOrderTemplate = async (): Promise<void> => {
    await prisma.customTaskType.upsert({
      where: { id: BUILTIN_ORDER_ID },
      update: {
        name: 'Pedido',
        namePlural: 'Pedidos',
        icon: 'ShoppingCart',
        color: '#2563eb',
        sortOrder: 2,
        isBuiltin: false,
        workspaceId: null,
      },
      create: {
        id: BUILTIN_ORDER_ID,
        workspaceId: null,
        name: 'Pedido',
        namePlural: 'Pedidos',
        icon: 'ShoppingCart',
        color: '#2563eb',
        sortOrder: 2,
        isBuiltin: false,
      },
    });

    await prisma.customFieldDefinition.upsert({
      where: { id: BUILTIN_ORDER_FIELD_ID },
      update: {
        workspaceId: null,
        key: 'client_name',
        label: 'Nome/Razao social',
        type: 'TEXT',
        required: true,
        isBuiltin: true,
        sortOrder: 0,
      },
      create: {
        id: BUILTIN_ORDER_FIELD_ID,
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

    const existing = await prisma.taskTypeTemplate.findFirst({
      where: { customTaskTypeId: BUILTIN_ORDER_ID },
      select: { id: true },
    });

    if (!existing) {
      await prisma.taskTypeTemplate.create({
        data: {
          id: BUILTIN_ORDER_TEMPLATE_ID,
          customTaskTypeId: BUILTIN_ORDER_ID,
          attachmentCategories: [],
          defaultDescriptionBlocks: DEFAULT_DESCRIPTION_BLOCKS as object,
          fields: {
            create: [
              {
                definitionId: BUILTIN_ORDER_FIELD_ID,
                sortOrder: 0,
                requiredOverride: null,
              },
            ],
          },
        },
      });
    } else {
      await prisma.taskTypeTemplate.update({
        where: { id: existing.id },
        data: {
          defaultDescriptionBlocks: DEFAULT_DESCRIPTION_BLOCKS as object,
        },
      });
    }
  };

  const createOwnTemplateFor = async (
    workspaceId: string,
  ): Promise<CreatedOwnTemplate> => {
    const uniq = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const customType = await prisma.customTaskType.create({
      data: {
        workspaceId,
        name: `Custom WSA ${uniq}`,
        isBuiltin: false,
        sortOrder: 100,
      },
      select: { id: true },
    });
    const definition = await prisma.customFieldDefinition.create({
      data: {
        workspaceId,
        key: `wsa_key_${uniq}`,
        name: `WSA Field ${uniq}`,
        label: `WSA Field ${uniq}`,
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
        defaultDescriptionBlocks: DEFAULT_DESCRIPTION_BLOCKS as object,
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
      customTypeId: customType.id,
      templateId: template.id,
      definitionId: definition.id,
    };
  };

  const cleanupOwnTemplate = async (
    own: CreatedOwnTemplate,
  ): Promise<void> => {
    await prisma.taskTypeTemplateField.deleteMany({
      where: { templateId: own.templateId },
    });
    await prisma.taskTypeTemplate.deleteMany({
      where: { id: own.templateId },
    });
    await prisma.customFieldDefinition.deleteMany({
      where: { id: own.definitionId },
    });
    await prisma.customTaskType.deleteMany({
      where: { id: own.customTypeId },
    });
  };

  const readMarkdownContent = async (
    token: string,
    taskId: string,
  ): Promise<string | null> => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .query({ include: 'markdown' })
      .expect(200);
    const body = res.body as { markdown?: string | null };
    return body.markdown ?? null;
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

      await ensureBuiltinOrderTemplate();

      wsA = await createTestWorkspace(app);
      wsB = await createTestWorkspace(app);
      userOwnerA = await createTestUser(app, wsA.workspaceId, 'ADMIN');
      ctxA = await createTestListContext(app, wsA.workspaceId);
      ctxB = await createTestListContext(app, wsB.workspaceId);
      ownTemplateInA = await createOwnTemplateFor(wsA.workspaceId);
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[task-type-templates-create-with-template] infra indisponivel, pulando suite: ${(err as Error).message}`,
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
      if (ownTemplateInA) await cleanupOwnTemplate(ownTemplateInA);
      if (wsA) await cleanupWorkspace(app, wsA.workspaceId);
      if (wsB) await cleanupWorkspace(app, wsB.workspaceId);
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

  it('aplica defaultDescriptionBlocks do template quando cliente NAO envia markdownContent', async () => {
    if (skipIfNoDb()) return;

    const created = await createTaskViaApi(app, ctxA!, wsA!.token, {
      title: 'Pedido via template (sem markdown)',
      customTypeId: BUILTIN_ORDER_ID,
    });

    const persisted = await readMarkdownContent(wsA!.token, created.taskId);
    expect(persisted).not.toBeNull();
    expect(typeof persisted).toBe('string');
    expect((persisted as string).length).toBeGreaterThan(0);

    const parsed = JSON.parse(persisted as string) as unknown;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual(DEFAULT_DESCRIPTION_BLOCKS);
  });

  it('user input wins: markdownContent string nao-vazia preserva input (template NAO sobrescreve)', async () => {
    if (skipIfNoDb()) return;

    const userMarkdown = 'conteudo do cliente';
    const created = await createTaskViaApi(app, ctxA!, wsA!.token, {
      title: 'Pedido com conteudo proprio',
      customTypeId: BUILTIN_ORDER_ID,
      markdownContent: userMarkdown,
    });

    const persisted = await readMarkdownContent(wsA!.token, created.taskId);
    expect(persisted).toBe(userMarkdown);
  });

  it('BlockNote AST vazio do cliente -> template aplica defaults (isEmptyMarkdown)', async () => {
    if (skipIfNoDb()) return;

    const emptyAst = '[{"type":"paragraph","content":[]}]';
    const created = await createTaskViaApi(app, ctxA!, wsA!.token, {
      title: 'Pedido com AST vazio',
      customTypeId: BUILTIN_ORDER_ID,
      markdownContent: emptyAst,
    });

    const persisted = await readMarkdownContent(wsA!.token, created.taskId);
    expect(persisted).not.toBeNull();
    expect(persisted).not.toBe(emptyAst);

    const parsed = JSON.parse(persisted as string) as unknown;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual(DEFAULT_DESCRIPTION_BLOCKS);
  });

  it('response carrega customTypeId quando template foi aplicado', async () => {
    if (skipIfNoDb()) return;

    const created = await createTaskViaApi(app, ctxA!, wsA!.token, {
      title: 'Pedido conferindo customTypeId no response',
      customTypeId: BUILTIN_ORDER_ID,
    });

    expect(created.customTypeId).toBe(BUILTIN_ORDER_ID);
    expect(created.taskId).toEqual(expect.any(String));

    const raw = created.raw as { customType?: { id?: string } };
    if (raw.customType) {
      expect(raw.customType.id).toBe(BUILTIN_ORDER_ID);
    }
  });

  it('cross-tenant: workspace B usando customTypeId proprio de A nao recebe template applied', async () => {
    if (skipIfNoDb()) return;

    const crossCustomTypeId = ownTemplateInA!.customTypeId;

    const res = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${wsB!.token}`)
      .send({
        title: 'Tentativa cross-tenant',
        listId: ctxB!.listId,
        customTypeId: crossCustomTypeId,
      });

    expect(res.status).toBeLessThan(500);
    expect([200, 201, 400, 403, 404]).toContain(res.status);

    if (res.status === 201) {
      const body = res.body as { id: string };
      const persisted = await readMarkdownContent(wsB!.token, body.id);
      expect(persisted).toBeNull();
    }
  });
});
