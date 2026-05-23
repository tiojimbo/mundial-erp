/**
 * Reference Data Seed Script
 *
 * Populates: ProductTypes, Brands, UnitMeasures, ProductDepartments,
 * 27 Brazilian states, and the main company (Mundial Telhas).
 *
 * Idempotent — safe to run multiple times.
 * Run: npx ts-node prisma/seed-reference-data.ts
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏗️  Seeding reference data …');

  // =========================================================================
  // 1. PRODUCT TYPES (10 tipos da Mundial Telhas — PLANO seção 1.5b)
  // =========================================================================
  const productTypes = [
    { prefix: 'TT', name: 'Telhas Térmicas', eanDeptCode: '0001' },
    { prefix: 'TG', name: 'Telhas Galvalume', eanDeptCode: '0001' },
    { prefix: 'PT', name: 'Painel Térmico', eanDeptCode: '0004' },
    { prefix: 'PF', name: 'Parafusos', eanDeptCode: '0002' },
    { prefix: 'AC', name: 'Acabamentos', eanDeptCode: '0010' },
    { prefix: 'AX', name: 'Acessório', eanDeptCode: '0003' },
    { prefix: 'MP', name: 'Matéria Prima', eanDeptCode: '0005' },
    { prefix: 'IN', name: 'Insumos', eanDeptCode: '0006' },
    { prefix: 'IM', name: 'Imobilizado', eanDeptCode: '0007' },
    { prefix: 'OT', name: 'Outros', eanDeptCode: '0008' },
  ];

  for (const pt of productTypes) {
    await prisma.productType.upsert({
      where: { prefix: pt.prefix },
      update: { name: pt.name, eanDeptCode: pt.eanDeptCode },
      create: { prefix: pt.prefix, name: pt.name, eanDeptCode: pt.eanDeptCode },
    });
  }
  console.log(`  ✔ ${productTypes.length} product types`);

  // =========================================================================
  // 1b. PRODUCT DEPARTMENTS (departamentos da Mundial Telhas — PLANO 1.5b)
  // =========================================================================
  const productDepartments = [
    'Telhas e Coberturas',
    'Painéis e Fechamentos',
    'Parafusos e Fixadores',
    'Acabamentos',
    'Acessórios',
    'Matéria Prima',
    'Insumos',
    'Imobilizado',
  ];

  for (const name of productDepartments) {
    const exists = await prisma.productDepartment.findFirst({
      where: { name, deletedAt: null },
    });
    if (!exists) {
      await prisma.productDepartment.create({ data: { name } });
    }
  }
  console.log(`  ✔ ${productDepartments.length} product departments`);

  // =========================================================================
  // 1c. BRANDS (marcas — PLANO seção 1.5b)
  // =========================================================================
  const brandNames = [
    'Mundial Telhas',
    'Brasilit',
    'Eternit',
  ];

  for (const name of brandNames) {
    const exists = await prisma.brand.findFirst({
      where: { name, deletedAt: null },
    });
    if (!exists) {
      await prisma.brand.create({ data: { name } });
    }
  }
  console.log(`  ✔ ${brandNames.length} brands`);

  // =========================================================================
  // 1d. UNIT MEASURES (unidades de medida — PLANO seção 1.5b)
  // =========================================================================
  const unitMeasureNames = [
    'UN',  // unidade
    'CX',  // caixa
    'M2',  // metro quadrado
    'KG',  // quilograma
    'ML',  // metro linear
    'PC',  // peça
  ];

  for (const name of unitMeasureNames) {
    const exists = await prisma.unitMeasure.findFirst({
      where: { name, deletedAt: null },
    });
    if (!exists) {
      await prisma.unitMeasure.create({ data: { name } });
    }
  }
  console.log(`  ✔ ${unitMeasureNames.length} unit measures`);

  // =========================================================================
  // 2. STATES (27 estados brasileiros)
  // =========================================================================
  const states = [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' },
    { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
  ];

  for (const s of states) {
    await prisma.state.upsert({
      where: { uf: s.uf },
      update: { name: s.name },
      create: { uf: s.uf, name: s.name },
    });
  }
  console.log(`  ✔ ${states.length} states`);

  // =========================================================================
  // 2b. CUSTOM TASK TYPES — builtins (Tasks feature, Sprint 1 TSK-103)
  // --------------------------------------------------------------------------
  // workspaceId=NULL => tipo global visivel a todos os workspaces.
  // IDs deterministicos "builtin-task"/"builtin-milestone" garantem
  // idempotencia: reexecutar nao duplica (PK conflict -> upsert).
  // =========================================================================
  const builtinCustomTaskTypes = [
    {
      id: 'builtin-task',
      name: 'Tarefa',
      namePlural: 'Tarefas',
      icon: 'CircleDotIcon',
      color: '#6b7280',
      sortOrder: 0,
    },
    {
      id: 'builtin-milestone',
      name: 'Marco',
      namePlural: 'Marcos',
      icon: 'DiamondIcon',
      color: '#f59e0b',
      sortOrder: 1,
    },
  ];

  for (const ct of builtinCustomTaskTypes) {
    await prisma.customTaskType.upsert({
      where: { id: ct.id },
      update: {
        name: ct.name,
        namePlural: ct.namePlural,
        icon: ct.icon,
        color: ct.color,
        sortOrder: ct.sortOrder,
        isBuiltin: true,
        workspaceId: null,
      },
      create: {
        id: ct.id,
        name: ct.name,
        namePlural: ct.namePlural,
        icon: ct.icon,
        color: ct.color,
        sortOrder: ct.sortOrder,
        isBuiltin: true,
        workspaceId: null,
      },
    });
  }
  console.log(`  ✔ ${builtinCustomTaskTypes.length} builtin custom task types`);

  // =========================================================================
  // 2c. TASK TYPE TEMPLATES — builtins (M2/M3, Sprint 4 TTT-040)
  // --------------------------------------------------------------------------
  // Plano: .claude/plan/PLANO-TASK-TYPES-TEMPLATES.md §"Seeds — Detalhe Tecnico".
  //
  // Insere 2 builtins (Pedido + Requisicao de Estoque) seguindo o mesmo
  // formato visual de builtin-task/builtin-milestone, ACRESCIDOS de:
  //   - CustomFieldDefinitions tipadas (workspaceId NULL = global, isBuiltin=true)
  //   - TaskTypeTemplate 1:1 (attachmentCategories + defaultDescriptionBlocks)
  //   - TaskTypeTemplateField M:N ordenado (sortOrder estavel)
  //
  // IDs estaveis em todos os blocos garantem idempotencia perfeita: rodar 3x
  // resulta no MESMO estado final, zero duplicatas. Se um seed e atualizado,
  // o upsert reescreve apenas o registro afetado (sem cascata destrutiva).
  // =========================================================================

  // ---- Helpers tipados para evitar drift entre create/update ----
  type FieldSpec = {
    id: string;
    key: string;
    label: string;
    type:
      | 'TEXT'
      | 'NUMBER'
      | 'CURRENCY'
      | 'DATE'
      | 'DROPDOWN'
      | 'CPF'
      | 'CNPJ'
      | 'URL'
      | 'EMAIL'
      | 'PHONE';
    required: boolean;
    config: Record<string, unknown> | null;
    sortOrder: number;
  };

  type TemplateSeed = {
    customTaskType: {
      id: string;
      name: string;
      namePlural: string;
      description: string;
      icon: string;
      color: string;
      sortOrder: number;
    };
    fields: FieldSpec[];
    template: {
      id: string;
      attachmentCategories: unknown;
      defaultDescriptionBlocks: unknown;
    };
  };

  // ---------------------------------------------------------------------------
  // Seed A — builtin-order (Pedido)
  // ---------------------------------------------------------------------------
  const orderSeed: TemplateSeed = {
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
    fields: [
      {
        id: 'cfd-order-order_number',
        key: 'order_number',
        label: 'Numero do pedido',
        type: 'TEXT',
        required: false,
        config: { readOnly: true, hint: 'Gerado ao mover para FATURAR' },
        sortOrder: 0,
      },
      {
        id: 'cfd-order-client_cnpj',
        key: 'client_cnpj',
        label: 'CNPJ do cliente',
        type: 'CNPJ',
        required: false,
        config: null,
        sortOrder: 1,
      },
      {
        id: 'cfd-order-client_cpf',
        key: 'client_cpf',
        label: 'CPF do cliente',
        type: 'CPF',
        required: false,
        config: null,
        sortOrder: 2,
      },
      {
        id: 'cfd-order-client_name',
        key: 'client_name',
        label: 'Nome/Razao social',
        type: 'TEXT',
        required: true,
        config: null,
        sortOrder: 3,
      },
      {
        id: 'cfd-order-client_email',
        key: 'client_email',
        label: 'E-mail',
        type: 'EMAIL',
        required: false,
        config: null,
        sortOrder: 4,
      },
      {
        id: 'cfd-order-client_phone',
        key: 'client_phone',
        label: 'Telefone',
        type: 'PHONE',
        required: false,
        config: null,
        sortOrder: 5,
      },
      {
        id: 'cfd-order-delivery_address',
        key: 'delivery_address',
        label: 'Endereco de entrega',
        type: 'TEXT',
        required: false,
        config: null,
        sortOrder: 6,
      },
      {
        id: 'cfd-order-delivery_deadline',
        key: 'delivery_deadline',
        label: 'Prazo de entrega',
        type: 'DATE',
        required: false,
        config: null,
        sortOrder: 7,
      },
      {
        id: 'cfd-order-proposal_validity_days',
        key: 'proposal_validity_days',
        label: 'Validade da proposta (dias)',
        type: 'NUMBER',
        required: false,
        config: { min: 1, default: 7 },
        sortOrder: 8,
      },
      {
        id: 'cfd-order-subtotal',
        key: 'subtotal',
        label: 'Subtotal',
        type: 'CURRENCY',
        required: false,
        config: null,
        sortOrder: 9,
      },
      {
        id: 'cfd-order-freight',
        key: 'freight',
        label: 'Frete',
        type: 'CURRENCY',
        required: false,
        config: { default: 0 },
        sortOrder: 10,
      },
      {
        id: 'cfd-order-discount',
        key: 'discount',
        label: 'Desconto',
        type: 'CURRENCY',
        required: false,
        config: { default: 0 },
        sortOrder: 11,
      },
      {
        id: 'cfd-order-total',
        key: 'total',
        label: 'Total',
        type: 'CURRENCY',
        required: true,
        config: null,
        sortOrder: 12,
      },
      {
        id: 'cfd-order-paid_amount',
        key: 'paid_amount',
        label: 'Valor pago (entrada)',
        type: 'CURRENCY',
        required: false,
        config: { hint: 'Minimo 50% do total para faturar' },
        sortOrder: 13,
      },
      {
        id: 'cfd-order-payment_method',
        key: 'payment_method',
        label: 'Forma de pagamento',
        type: 'DROPDOWN',
        required: false,
        config: {
          options: [
            { value: 'pix', label: 'Pix' },
            { value: 'dinheiro', label: 'Dinheiro' },
            { value: 'cartao_credito', label: 'Cartao Credito' },
            { value: 'cartao_debito', label: 'Cartao Debito' },
            { value: 'boleto', label: 'Boleto' },
            { value: 'transferencia', label: 'Transferencia' },
          ],
        },
        sortOrder: 14,
      },
      {
        id: 'cfd-order-should_produce',
        key: 'should_produce',
        label: 'Contem itens de fabricacao propria?',
        type: 'DROPDOWN',
        required: false,
        config: {
          options: [
            { value: 'true', label: 'Sim' },
            { value: 'false', label: 'Nao' },
          ],
        },
        sortOrder: 15,
      },
      {
        id: 'cfd-order-is_resale',
        key: 'is_resale',
        label: 'Contem itens de revenda?',
        type: 'DROPDOWN',
        required: false,
        config: {
          options: [
            { value: 'true', label: 'Sim' },
            { value: 'false', label: 'Nao' },
          ],
        },
        sortOrder: 16,
      },
    ],
    template: {
      id: 'template-order',
      attachmentCategories: [
        {
          slug: 'proposta',
          label: 'Proposta assinada',
          required: false,
          mimeWhitelist: ['application/pdf'],
        },
        {
          slug: 'comprovante',
          label: 'Comprovante pagamento',
          required: true,
          mimeWhitelist: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        {
          slug: 'nota_fiscal',
          label: 'Nota fiscal NF-e',
          required: false,
          mimeWhitelist: ['application/pdf', 'application/xml'],
        },
      ],
      defaultDescriptionBlocks: [
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
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // Seed B — builtin-stock-request (Requisicao de Estoque)
  // ---------------------------------------------------------------------------
  const stockRequestSeed: TemplateSeed = {
    customTaskType: {
      id: 'builtin-stock-request',
      name: 'Requisicao de Estoque',
      namePlural: 'Requisicoes de Estoque',
      description:
        'Requisicao interna ou de venda do processo Compras/Suprimentos — fluxo Pendente -> Aprovada -> Processada via scanner.',
      icon: 'PackageOpen',
      color: '#059669',
      sortOrder: 3,
    },
    fields: [
      {
        id: 'cfd-stockreq-requisition_code',
        key: 'requisition_code',
        label: 'Codigo da requisicao',
        type: 'TEXT',
        required: false,
        config: { readOnly: true, hint: 'Formato REQ-AAAAMMDD-NNN' },
        sortOrder: 0,
      },
      {
        id: 'cfd-stockreq-type',
        key: 'type',
        label: 'Tipo',
        type: 'DROPDOWN',
        required: true,
        config: {
          options: [
            { value: 'VENDA', label: 'Venda' },
            { value: 'INTERNO', label: 'Interno' },
          ],
        },
        sortOrder: 1,
      },
      {
        id: 'cfd-stockreq-linked_order_number',
        key: 'linked_order_number',
        label: 'N° do pedido vinculado',
        type: 'TEXT',
        required: false,
        config: {
          hint: 'Obrigatorio se tipo = Venda',
          requiredWhen: { field: 'type', equals: 'VENDA' },
        },
        sortOrder: 2,
      },
      {
        id: 'cfd-stockreq-client_name',
        key: 'client_name',
        label: 'Cliente vinculado',
        type: 'TEXT',
        required: false,
        config: null,
        sortOrder: 3,
      },
      {
        id: 'cfd-stockreq-requester_area',
        key: 'requester_area',
        label: 'Area solicitante',
        type: 'TEXT',
        required: false,
        config: null,
        sortOrder: 4,
      },
      {
        id: 'cfd-stockreq-requested_date',
        key: 'requested_date',
        label: 'Data de solicitacao',
        type: 'DATE',
        required: true,
        config: null,
        sortOrder: 5,
      },
      {
        id: 'cfd-stockreq-processed_date',
        key: 'processed_date',
        label: 'Data de processamento',
        type: 'DATE',
        required: false,
        config: null,
        sortOrder: 6,
      },
    ],
    template: {
      id: 'template-stock-request',
      attachmentCategories: [
        {
          slug: 'requisicao_pdf',
          label: 'Requisicao PDF',
          required: false,
          mimeWhitelist: ['application/pdf'],
        },
        {
          slug: 'comprovante_separacao',
          label: 'Comprovante separacao',
          required: false,
          mimeWhitelist: ['image/jpeg', 'image/png', 'application/pdf'],
        },
      ],
      defaultDescriptionBlocks: [
        {
          type: 'heading',
          props: { level: 2 },
          content: [{ type: 'text', text: 'Itens solicitados' }],
        },
        { type: 'paragraph', content: [] },
        {
          type: 'heading',
          props: { level: 2 },
          content: [{ type: 'text', text: 'Observacoes de separacao' }],
        },
        { type: 'paragraph', content: [] },
      ],
    },
  };

  const templateSeeds: TemplateSeed[] = [orderSeed, stockRequestSeed];

  let totalCustomTypes = 0;
  let totalDefinitions = 0;
  let totalTemplates = 0;
  let totalTemplateFields = 0;

  for (const seed of templateSeeds) {
    // CustomTaskType de template (Pedido, Requisicao). isBuiltin=false: sao
    // pre-criados pelo seed mas podem ser editados/removidos pelo workspace.
    // Apenas builtin-task/builtin-milestone (Tarefa/Marco) permanecem builtin.
    await prisma.customTaskType.upsert({
      where: { id: seed.customTaskType.id },
      update: {
        name: seed.customTaskType.name,
        namePlural: seed.customTaskType.namePlural,
        description: seed.customTaskType.description,
        icon: seed.customTaskType.icon,
        color: seed.customTaskType.color,
        sortOrder: seed.customTaskType.sortOrder,
        isBuiltin: false,
        workspaceId: null,
      },
      create: {
        id: seed.customTaskType.id,
        name: seed.customTaskType.name,
        namePlural: seed.customTaskType.namePlural,
        description: seed.customTaskType.description,
        icon: seed.customTaskType.icon,
        color: seed.customTaskType.color,
        sortOrder: seed.customTaskType.sortOrder,
        isBuiltin: false,
        workspaceId: null,
      },
    });
    totalCustomTypes += 1;

    // 2) CustomFieldDefinitions (workspaceId NULL, isBuiltin=true). IDs
    //    estaveis (`cfd-<source>-<key>`) garantem idempotencia.
    for (const f of seed.fields) {
      const configValue: Prisma.InputJsonValue | typeof Prisma.JsonNull =
        f.config === null
          ? Prisma.JsonNull
          : (f.config as Prisma.InputJsonValue);
      await prisma.customFieldDefinition.upsert({
        where: { id: f.id },
        update: {
          workspaceId: null,
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          config: configValue,
          isBuiltin: true,
          sortOrder: f.sortOrder,
        },
        create: {
          id: f.id,
          workspaceId: null,
          key: f.key,
          name: f.label,
          label: f.label,
          type: f.type,
          required: f.required,
          config: configValue,
          isBuiltin: true,
          sortOrder: f.sortOrder,
        },
      });
      totalDefinitions += 1;
    }

    // 3) TaskTypeTemplate (1:1 com CustomTaskType).
    await prisma.taskTypeTemplate.upsert({
      where: { id: seed.template.id },
      update: {
        customTaskTypeId: seed.customTaskType.id,
        attachmentCategories: seed.template.attachmentCategories as object,
        defaultDescriptionBlocks: seed.template.defaultDescriptionBlocks as object,
      },
      create: {
        id: seed.template.id,
        customTaskTypeId: seed.customTaskType.id,
        attachmentCategories: seed.template.attachmentCategories as object,
        defaultDescriptionBlocks: seed.template.defaultDescriptionBlocks as object,
      },
    });
    totalTemplates += 1;

    // 4) TaskTypeTemplateFields (M:N) — chave composta (templateId, definitionId).
    for (const f of seed.fields) {
      await prisma.taskTypeTemplateField.upsert({
        where: {
          templateId_definitionId: {
            templateId: seed.template.id,
            definitionId: f.id,
          },
        },
        update: {
          sortOrder: f.sortOrder,
          requiredOverride: null,
        },
        create: {
          templateId: seed.template.id,
          definitionId: f.id,
          sortOrder: f.sortOrder,
          requiredOverride: null,
        },
      });
      totalTemplateFields += 1;
    }
  }

  console.log(
    `  ✔ ${totalCustomTypes} task type templates (custom types) + ${totalDefinitions} field definitions + ${totalTemplates} templates + ${totalTemplateFields} template fields`,
  );

  // =========================================================================
  // 2b. CODIGO DO PEDIDO (campo computado, builtin global)
  // =========================================================================
  const orderCodeConfig: Prisma.InputJsonValue = {
    readOnly: true,
    padStart: 4,
    hint: 'Gerado automaticamente ao criar o pedido',
  };
  await prisma.customFieldDefinition.upsert({
    where: { id: 'cfd-builtin-order_code' },
    update: {
      workspaceId: null,
      customTaskTypeId: null,
      key: 'order_code',
      label: 'Codigo do Pedido',
      type: 'NUMBER',
      required: false,
      config: orderCodeConfig,
      fillMethod: 'computed',
      isBuiltin: true,
      sortOrder: 0,
    },
    create: {
      id: 'cfd-builtin-order_code',
      workspaceId: null,
      key: 'order_code',
      name: 'Codigo do Pedido',
      label: 'Codigo do Pedido',
      type: 'NUMBER',
      required: false,
      config: orderCodeConfig,
      fillMethod: 'computed',
      isBuiltin: true,
      sortOrder: 0,
    },
  });
  console.log('  ✔ Campo computado Codigo do Pedido');

  // =========================================================================
  // 2c. CNPJ Autofill — campos destino do autopreenchimento por CNPJ.
  //     workspaceId NULL (global, todos os workspaces); isBuiltin=false
  //     (localizacao editavel pela UI). IDs `cfd-cnpj-af-*` sao dependencia
  //     do frontend (use-cnpj-autofill) — nao renomear.
  // =========================================================================
  const cnpjAutofillFields: {
    key: string;
    label: string;
    type: 'TEXT' | 'EMAIL' | 'PHONE' | 'DATE' | 'CURRENCY';
    sortOrder: number;
  }[] = [
    { key: 'cnpj_af_razao_social', label: 'Razão Social', type: 'TEXT', sortOrder: 1 },
    { key: 'cnpj_af_nome_fantasia', label: 'Nome Fantasia', type: 'TEXT', sortOrder: 2 },
    { key: 'cnpj_af_email', label: 'E-mail', type: 'EMAIL', sortOrder: 3 },
    { key: 'cnpj_af_telefone', label: 'Telefone', type: 'PHONE', sortOrder: 4 },
    { key: 'cnpj_af_cep', label: 'CEP', type: 'TEXT', sortOrder: 5 },
    { key: 'cnpj_af_logradouro', label: 'Logradouro', type: 'TEXT', sortOrder: 6 },
    { key: 'cnpj_af_numero', label: 'Número', type: 'TEXT', sortOrder: 7 },
    { key: 'cnpj_af_complemento', label: 'Complemento', type: 'TEXT', sortOrder: 8 },
    { key: 'cnpj_af_bairro', label: 'Bairro', type: 'TEXT', sortOrder: 9 },
    { key: 'cnpj_af_municipio', label: 'Cidade', type: 'TEXT', sortOrder: 10 },
    { key: 'cnpj_af_uf', label: 'UF', type: 'TEXT', sortOrder: 11 },
    { key: 'cnpj_af_data_abertura', label: 'Data de Abertura', type: 'DATE', sortOrder: 12 },
    { key: 'cnpj_af_situacao', label: 'Situação Cadastral', type: 'TEXT', sortOrder: 13 },
    { key: 'cnpj_af_natureza', label: 'Natureza Jurídica', type: 'TEXT', sortOrder: 14 },
    { key: 'cnpj_af_cnae_codigo', label: 'CNAE Código', type: 'TEXT', sortOrder: 15 },
    { key: 'cnpj_af_cnae_descricao', label: 'CNAE Descrição', type: 'TEXT', sortOrder: 16 },
    { key: 'cnpj_af_porte', label: 'Porte', type: 'TEXT', sortOrder: 17 },
    { key: 'cnpj_af_capital_social', label: 'Capital Social', type: 'CURRENCY', sortOrder: 18 },
  ];

  let totalCnpjFields = 0;
  for (const f of cnpjAutofillFields) {
    const id = `cfd-${f.key.replace(/_/g, '-')}`;
    await prisma.customFieldDefinition.upsert({
      where: { id },
      update: {
        workspaceId: null,
        key: f.key,
        name: f.label,
        label: f.label,
        type: f.type,
        required: false,
        config: Prisma.JsonNull,
        isBuiltin: false,
        sortOrder: f.sortOrder,
      },
      create: {
        id,
        workspaceId: null,
        key: f.key,
        name: f.label,
        label: f.label,
        type: f.type,
        required: false,
        config: Prisma.JsonNull,
        isBuiltin: false,
        sortOrder: f.sortOrder,
      },
    });
    totalCnpjFields += 1;
  }
  console.log(`  ✔ ${totalCnpjFields} campos de autopreenchimento CNPJ`);

  // =========================================================================
  // 3. MAIN COMPANY (Mundial Telhas)
  // =========================================================================
  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000100' },
    update: {
      name: 'Mundial Telhas',
      tradeName: 'Mundial Telhas',
    },
    create: {
      name: 'Mundial Telhas',
      tradeName: 'Mundial Telhas',
      cnpj: '00000000000100',
    },
  });
  console.log(`  ✔ Main company: ${company.name} (id: ${company.id})`);

  console.log('✅ Reference data seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
