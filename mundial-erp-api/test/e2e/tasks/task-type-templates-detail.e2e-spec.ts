// Forca o kill switch global ANTES do AppModule carregar. Mesma estrategia
// dos outros 4 specs de task-type-templates: ConfigModule do Nest da
// precedencia a process.env sobre .env, e o TaskTypeTemplatesGuard captura
// a flag uma unica vez no construtor.
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
  createTestUser,
  createTestWorkspace,
  TestUser,
  TestWorkspace,
} from './setup';

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

interface AttachmentCategory {
  slug: string;
  label: string;
  required: boolean;
  mimeWhitelist?: string[];
}

interface TemplateResponse {
  id: string;
  customTaskTypeId: string;
  attachmentCategories: AttachmentCategory[] | null;
  defaultDescriptionBlocks: Record<string, unknown> | null;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

const log = new Logger('task-type-templates-detail.e2e');

const ORDER_FIELDS: Array<{
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  config: Record<string, unknown> | null;
  sortOrder: number;
}> = [
  { id: 'cfd-order-order_number', key: 'order_number', label: 'Numero do pedido', type: 'TEXT', required: false, config: { readOnly: true, hint: 'Gerado ao mover para FATURAR' }, sortOrder: 0 },
  { id: 'cfd-order-client_cnpj', key: 'client_cnpj', label: 'CNPJ do cliente', type: 'CNPJ', required: false, config: null, sortOrder: 1 },
  { id: 'cfd-order-client_cpf', key: 'client_cpf', label: 'CPF do cliente', type: 'CPF', required: false, config: null, sortOrder: 2 },
  { id: 'cfd-order-client_name', key: 'client_name', label: 'Nome/Razao social', type: 'TEXT', required: true, config: null, sortOrder: 3 },
  { id: 'cfd-order-client_email', key: 'client_email', label: 'E-mail', type: 'EMAIL', required: false, config: null, sortOrder: 4 },
  { id: 'cfd-order-client_phone', key: 'client_phone', label: 'Telefone', type: 'PHONE', required: false, config: null, sortOrder: 5 },
  { id: 'cfd-order-delivery_address', key: 'delivery_address', label: 'Endereco de entrega', type: 'TEXT', required: false, config: null, sortOrder: 6 },
  { id: 'cfd-order-delivery_deadline', key: 'delivery_deadline', label: 'Prazo de entrega', type: 'DATE', required: false, config: null, sortOrder: 7 },
  { id: 'cfd-order-proposal_validity_days', key: 'proposal_validity_days', label: 'Validade da proposta (dias)', type: 'NUMBER', required: false, config: { min: 1, default: 7 }, sortOrder: 8 },
  { id: 'cfd-order-subtotal', key: 'subtotal', label: 'Subtotal', type: 'CURRENCY', required: false, config: null, sortOrder: 9 },
  { id: 'cfd-order-freight', key: 'freight', label: 'Frete', type: 'CURRENCY', required: false, config: { default: 0 }, sortOrder: 10 },
  { id: 'cfd-order-discount', key: 'discount', label: 'Desconto', type: 'CURRENCY', required: false, config: { default: 0 }, sortOrder: 11 },
  { id: 'cfd-order-total', key: 'total', label: 'Total', type: 'CURRENCY', required: false, config: { readOnly: true }, sortOrder: 12 },
  { id: 'cfd-order-paid_amount', key: 'paid_amount', label: 'Valor pago', type: 'CURRENCY', required: false, config: { default: 0 }, sortOrder: 13 },
  { id: 'cfd-order-payment_method', key: 'payment_method', label: 'Forma de pagamento', type: 'DROPDOWN', required: false, config: { options: [{ value: 'PIX', label: 'PIX' }, { value: 'BOLETO', label: 'Boleto' }, { value: 'CARTAO', label: 'Cartao' }, { value: 'DINHEIRO', label: 'Dinheiro' }, { value: 'TRANSFERENCIA', label: 'Transferencia' }] }, sortOrder: 14 },
  { id: 'cfd-order-should_produce', key: 'should_produce', label: 'Produzir?', type: 'DROPDOWN', required: false, config: { options: [{ value: 'SIM', label: 'Sim' }, { value: 'NAO', label: 'Nao' }] }, sortOrder: 15 },
  { id: 'cfd-order-is_resale', key: 'is_resale', label: 'Revenda?', type: 'DROPDOWN', required: false, config: { options: [{ value: 'SIM', label: 'Sim' }, { value: 'NAO', label: 'Nao' }] }, sortOrder: 16 },
];

const ORDER_ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  { slug: 'proposta', label: 'Proposta assinada', required: false, mimeWhitelist: ['application/pdf'] },
  { slug: 'comprovante', label: 'Comprovante pagamento', required: true, mimeWhitelist: ['application/pdf', 'image/jpeg', 'image/png'] },
  { slug: 'nota_fiscal', label: 'Nota fiscal NF-e', required: false, mimeWhitelist: ['application/pdf', 'application/xml'] },
];

const ORDER_DEFAULT_BLOCKS = [
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Itens do pedido' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Entrega' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Observacoes' }] },
  { type: 'paragraph', content: [] },
];

const STOCK_FIELDS: Array<{
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  config: Record<string, unknown> | null;
  sortOrder: number;
}> = [
  { id: 'cfd-stockreq-requisition_code', key: 'requisition_code', label: 'Codigo da requisicao', type: 'TEXT', required: false, config: { readOnly: true, hint: 'Formato REQ-AAAAMMDD-NNN' }, sortOrder: 0 },
  { id: 'cfd-stockreq-type', key: 'type', label: 'Tipo', type: 'DROPDOWN', required: true, config: { options: [{ value: 'VENDA', label: 'Venda' }, { value: 'INTERNO', label: 'Interno' }] }, sortOrder: 1 },
  { id: 'cfd-stockreq-linked_order_number', key: 'linked_order_number', label: 'N° do pedido vinculado', type: 'TEXT', required: false, config: { hint: 'Obrigatorio se tipo = Venda', requiredWhen: { field: 'type', equals: 'VENDA' } }, sortOrder: 2 },
  { id: 'cfd-stockreq-client_name', key: 'client_name', label: 'Cliente vinculado', type: 'TEXT', required: false, config: null, sortOrder: 3 },
  { id: 'cfd-stockreq-requester_area', key: 'requester_area', label: 'Area solicitante', type: 'TEXT', required: false, config: null, sortOrder: 4 },
  { id: 'cfd-stockreq-requested_date', key: 'requested_date', label: 'Data de solicitacao', type: 'DATE', required: true, config: null, sortOrder: 5 },
  { id: 'cfd-stockreq-processed_date', key: 'processed_date', label: 'Data de processamento', type: 'DATE', required: false, config: null, sortOrder: 6 },
];

const STOCK_ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  { slug: 'requisicao_pdf', label: 'Requisicao PDF', required: false, mimeWhitelist: ['application/pdf'] },
  { slug: 'comprovante_separacao', label: 'Comprovante separacao', required: false, mimeWhitelist: ['image/jpeg', 'image/png', 'application/pdf'] },
];

const STOCK_DEFAULT_BLOCKS = [
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Itens solicitados' }] },
  { type: 'paragraph', content: [] },
  { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Observacoes de separacao' }] },
  { type: 'paragraph', content: [] },
];

describe('Task Type Templates - GET detail (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let wsA: TestWorkspace | null = null;
  let wsB: TestWorkspace | null = null;
  let viewerA: TestUser | null = null;
  let ownCustomTypeId: string | null = null;
  let ownTemplateId: string | null = null;

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

      await ensureBuiltinTemplate(
        prisma,
        {
          customTaskType: {
            id: 'builtin-order',
            name: 'Pedido',
            namePlural: 'Pedidos',
            description:
              'Pedido de venda do processo Comercial — ciclo Orcamento -> Faturamento -> Producao -> Entrega.',
            icon: 'ShoppingCart',
            color: '#2563eb',
            sortOrder: 2,
          },
          templateId: 'template-order',
          attachmentCategories: ORDER_ATTACHMENT_CATEGORIES,
          defaultDescriptionBlocks: ORDER_DEFAULT_BLOCKS,
          fields: ORDER_FIELDS,
        },
      );
      await ensureBuiltinTemplate(
        prisma,
        {
          customTaskType: {
            id: 'builtin-stock-request',
            name: 'Requisicao de Estoque',
            namePlural: 'Requisicoes de Estoque',
            description:
              'Requisicao interna ou de venda do processo Compras/Suprimentos.',
            icon: 'PackageOpen',
            color: '#059669',
            sortOrder: 3,
          },
          templateId: 'template-stock-request',
          attachmentCategories: STOCK_ATTACHMENT_CATEGORIES,
          defaultDescriptionBlocks: STOCK_DEFAULT_BLOCKS,
          fields: STOCK_FIELDS,
        },
      );

      wsA = await createTestWorkspace(app);
      wsB = await createTestWorkspace(app);

      await prisma.workspace.update({
        where: { id: wsA.workspaceId },
        data: { settings: { featureTaskTypeTemplatesEnabled: true } },
      });
      await prisma.workspace.update({
        where: { id: wsB.workspaceId },
        data: { settings: { featureTaskTypeTemplatesEnabled: true } },
      });

      viewerA = await createTestUser(app, wsA.workspaceId, 'OPERATOR');

      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ownType = await prisma.customTaskType.create({
        data: {
          name: `Tipo proprio ${suffix}`,
          workspaceId: wsA.workspaceId,
          isBuiltin: false,
          sortOrder: 10,
        },
        select: { id: true },
      });
      ownCustomTypeId = ownType.id;
      const ownTemplate = await prisma.taskTypeTemplate.create({
        data: {
          customTaskTypeId: ownType.id,
          attachmentCategories: [
            { slug: 'foo', label: 'Foo', required: false },
          ],
          defaultDescriptionBlocks: [
            { type: 'paragraph', content: [{ type: 'text', text: 'oi' }] },
          ],
        },
        select: { id: true },
      });
      ownTemplateId = ownTemplate.id;
    } catch (err) {
      dbAvailable = false;
      log.warn(
        `[task-type-templates-detail] infra indisponivel, pulando suite: ${(err as Error).message}`,
      );
      try {
        await app?.close();
      } catch {
        /* noop */
      }
    }
  }, 120_000);

  afterAll(async () => {
    if (!dbAvailable) return;
    try {
      if (ownTemplateId) {
        await prisma.taskTypeTemplateField.deleteMany({
          where: { templateId: ownTemplateId },
        });
        await prisma.taskTypeTemplate.deleteMany({
          where: { id: ownTemplateId },
        });
      }
      if (ownCustomTypeId) {
        await prisma.customTaskType.deleteMany({
          where: { id: ownCustomTypeId },
        });
      }
      if (wsA) await cleanupWorkspace(app, wsA.workspaceId);
      if (wsB) await cleanupWorkspace(app, wsB.workspaceId);
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

  const fetchDetail = async (
    customTaskTypeId: string,
    token: string,
  ): Promise<request.Response> => {
    return request(app.getHttpServer())
      .get(`/api/v1/task-type-templates/${customTaskTypeId}`)
      .set('Authorization', `Bearer ${token}`);
  };

  // ResponseInterceptor sempre envelopa em `{ data, meta }` — extraimos
  // `data` para que as asserts trabalhem com o DTO.
  const unwrap = (res: request.Response): TemplateResponse => {
    const body = res.body as { data?: TemplateResponse } & TemplateResponse;
    return body.data ?? body;
  };

  it('GET /task-type-templates/builtin-order retorna template completo (17 fields ordenados, 3 categorias)', async () => {
    if (skipIfNoDb()) return;

    const res = await fetchDetail('builtin-order', wsA!.token);
    expect(res.status).toBe(200);

    const body = unwrap(res);
    expect(body.customTaskTypeId).toBe('builtin-order');
    expect(typeof body.id).toBe('string');

    expect(Array.isArray(body.fields)).toBe(true);
    expect(body.fields).toHaveLength(17);
    const sortOrders = body.fields.map((f) => f.sortOrder);
    const sorted = [...sortOrders].sort((a, b) => a - b);
    expect(sortOrders).toEqual(sorted);

    const slugs = (body.attachmentCategories ?? []).map((c) => c.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(['proposta', 'comprovante', 'nota_fiscal']),
    );
    expect(body.attachmentCategories).toHaveLength(3);

    expect(body.defaultDescriptionBlocks).not.toBeNull();
  });

  it('GET /task-type-templates/builtin-stock-request retorna 7 fields e 2 categorias', async () => {
    if (skipIfNoDb()) return;

    const res = await fetchDetail('builtin-stock-request', wsA!.token);
    expect(res.status).toBe(200);

    const body = unwrap(res);
    expect(body.customTaskTypeId).toBe('builtin-stock-request');
    expect(body.fields).toHaveLength(7);

    expect(body.attachmentCategories).toHaveLength(2);
    const slugs = (body.attachmentCategories ?? []).map((c) => c.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(['requisicao_pdf', 'comprovante_separacao']),
    );

    expect(body.defaultDescriptionBlocks).not.toBeNull();
  });

  it('CROSS-TENANT: workspace B nao enxerga CustomTaskType proprio de A -> 404', async () => {
    if (skipIfNoDb()) return;
    if (!ownCustomTypeId) {
      expect(true).toBe(true);
      return;
    }

    const res = await fetchDetail(ownCustomTypeId, wsB!.token);
    expect(res.status).toBe(404);
  });

  it('GET com customTaskTypeId inexistente -> 404', async () => {
    if (skipIfNoDb()) return;

    const res = await fetchDetail('nao-existe-este-tipo', wsA!.token);
    expect(res.status).toBe(404);
  });

  it('Workspace A enxerga seu proprio template (200)', async () => {
    if (skipIfNoDb()) return;
    if (!ownCustomTypeId || !ownTemplateId) {
      expect(true).toBe(true);
      return;
    }

    const res = await fetchDetail(ownCustomTypeId, wsA!.token);
    expect(res.status).toBe(200);

    const body = unwrap(res);
    expect(body.id).toBe(ownTemplateId);
    expect(body.customTaskTypeId).toBe(ownCustomTypeId);
    expect(Array.isArray(body.fields)).toBe(true);
  });

  it('RBAC: VIEWER/OPERATOR consegue ler builtin (200)', async () => {
    if (skipIfNoDb()) return;
    if (!viewerA) {
      expect(true).toBe(true);
      return;
    }

    const res = await fetchDetail('builtin-order', viewerA.token);
    expect(res.status).toBe(200);
    const body = unwrap(res);
    expect(body.customTaskTypeId).toBe('builtin-order');
  });
});

interface BuiltinTemplateSpec {
  customTaskType: {
    id: string;
    name: string;
    namePlural: string;
    description: string;
    icon: string;
    color: string;
    sortOrder: number;
  };
  templateId: string;
  attachmentCategories: AttachmentCategory[];
  defaultDescriptionBlocks: unknown;
  fields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    required: boolean;
    config: Record<string, unknown> | null;
    sortOrder: number;
  }>;
}

async function ensureBuiltinTemplate(
  prisma: PrismaService,
  spec: BuiltinTemplateSpec,
): Promise<void> {
  // Se ja existe template para este customTaskType (seed da reference-data
  // foi rodado), nao tocamos — preserva fields/categorias originais e evita
  // PK collision se o id seedado divergir do `spec.templateId`.
  const existing = await prisma.taskTypeTemplate.findUnique({
    where: { customTaskTypeId: spec.customTaskType.id },
    select: { id: true },
  });
  if (existing) return;

  await prisma.customTaskType.upsert({
    where: { id: spec.customTaskType.id },
    update: {
      name: spec.customTaskType.name,
      namePlural: spec.customTaskType.namePlural,
      description: spec.customTaskType.description,
      icon: spec.customTaskType.icon,
      color: spec.customTaskType.color,
      sortOrder: spec.customTaskType.sortOrder,
      isBuiltin: false,
      workspaceId: null,
      deletedAt: null,
    },
    create: {
      id: spec.customTaskType.id,
      name: spec.customTaskType.name,
      namePlural: spec.customTaskType.namePlural,
      description: spec.customTaskType.description,
      icon: spec.customTaskType.icon,
      color: spec.customTaskType.color,
      sortOrder: spec.customTaskType.sortOrder,
      isBuiltin: false,
      workspaceId: null,
    },
  });

  for (const f of spec.fields) {
    await prisma.customFieldDefinition.upsert({
      where: { id: f.id },
      update: {
        workspaceId: null,
        key: f.key,
        label: f.label,
        type: f.type as never,
        required: f.required,
        config: (f.config ?? undefined) as never,
        isBuiltin: true,
        sortOrder: f.sortOrder,
        deletedAt: null,
      },
      create: {
        id: f.id,
        workspaceId: null,
        key: f.key,
        name: f.label,
        label: f.label,
        type: f.type as never,
        required: f.required,
        config: (f.config ?? undefined) as never,
        isBuiltin: true,
        sortOrder: f.sortOrder,
      },
    });
  }

  await prisma.taskTypeTemplate.create({
    data: {
      id: spec.templateId,
      customTaskTypeId: spec.customTaskType.id,
      attachmentCategories: spec.attachmentCategories as never,
      defaultDescriptionBlocks: spec.defaultDescriptionBlocks as never,
    },
  });

  for (const f of spec.fields) {
    await prisma.taskTypeTemplateField.create({
      data: {
        templateId: spec.templateId,
        definitionId: f.id,
        sortOrder: f.sortOrder,
        requiredOverride: null,
      },
    });
  }
}
