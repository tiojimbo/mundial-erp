/**
 * BPM Seed Script
 *
 * Populates all BPM definition data: departments, sectors, processes,
 * activities (with 7 mandatory fields), tasks, and handoffs.
 *
 * Idempotent — uses upsert with slug as identifier where available.
 * Run: npx ts-node prisma/seed-bpm.ts
 */

import 'dotenv/config';
import { PrismaClient, Role, OrderStatus, ProcessStatus, ProcessType, StatusCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helper: upsert a task list for a given activity (delete + recreate)
// ---------------------------------------------------------------------------
async function syncTasks(activityId: string, descriptions: string[]) {
  await prisma.task.deleteMany({ where: { activityId } });
  for (let i = 0; i < descriptions.length; i++) {
    await prisma.task.create({
      data: {
        activityId,
        description: descriptions[i],
        sortOrder: i + 1,
        isMandatory: true,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Helper: upsert a handoff (find by fromProcessId+toProcessId, create or update)
// ---------------------------------------------------------------------------
async function upsertHandoff(data: {
  fromProcessId: string;
  toProcessId: string;
  triggerOnStatus: OrderStatus | null;
  autoAdvance: boolean;
  validationRules: object;
}) {
  const existing = await prisma.handoff.findFirst({
    where: {
      fromProcessId: data.fromProcessId,
      toProcessId: data.toProcessId,
    },
  });

  if (existing) {
    await prisma.handoff.update({
      where: { id: existing.id },
      data: {
        triggerOnStatus: data.triggerOnStatus,
        autoAdvance: data.autoAdvance,
        validationRules: data.validationRules,
      },
    });
  } else {
    await prisma.handoff.create({ data });
  }
}

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  console.log('🏗️  Seeding BPM definitions …');

  // =========================================================================
  // 1. DEPARTMENTS
  // =========================================================================
  const deptData = [
    { name: 'COMERCIAL', slug: 'comercial', sortOrder: 1, icon: 'ri-hand-coin-line', color: '#d97706' },
    { name: 'COMPRAS', slug: 'compras', sortOrder: 2, icon: 'ri-shopping-cart-line', color: '#0d9488' },
    { name: 'PRODUCAO', slug: 'producao', sortOrder: 3, icon: 'ri-tools-line', color: '#22c55e' },
    { name: 'FINANCEIRO', slug: 'financeiro', sortOrder: 4, icon: 'ri-wallet-line', color: '#ea580c' },
  ] as const;

  const departments: Record<string, string> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { slug: d.slug },
      update: { name: d.name, sortOrder: d.sortOrder, icon: d.icon, color: d.color, isDefault: true, isProtected: true },
      create: { name: d.name, slug: d.slug, sortOrder: d.sortOrder, icon: d.icon, color: d.color, isDefault: true, isProtected: true },
    });
    departments[d.slug] = dept.id;
  }
  console.log(`  ✔ ${Object.keys(departments).length} departments`);

  // =========================================================================
  // 2. SECTORS
  // =========================================================================
  const sectorData = [
    { name: 'Pedidos', slug: 'pedidos', deptSlug: 'comercial' },
    { name: 'Cadastro de Clientes', slug: 'cadastro-clientes', deptSlug: 'comercial' },
    { name: 'Gestão de Produtos', slug: 'gestao-produtos', deptSlug: 'compras' },
    { name: 'Cotação e Compra', slug: 'cotacao-compra', deptSlug: 'compras' },
    { name: 'Produção do Pedido', slug: 'producao-pedido', deptSlug: 'producao' },
    { name: 'Conferência e Entrega', slug: 'conferencia-entrega', deptSlug: 'producao' },
    { name: 'Conciliação e Faturamento', slug: 'conciliacao-faturamento', deptSlug: 'financeiro' },
    { name: 'Contas a Receber', slug: 'contas-receber', deptSlug: 'financeiro' },
    { name: 'Contas a Pagar', slug: 'contas-pagar', deptSlug: 'financeiro' },
    { name: 'Controle Financeiro', slug: 'controle-financeiro', deptSlug: 'financeiro' },
  ] as const;

  const sectors: Record<string, string> = {};
  for (const s of sectorData) {
    const sector = await prisma.sector.upsert({
      where: { slug: s.slug },
      update: { name: s.name, departmentId: departments[s.deptSlug] },
      create: {
        name: s.name,
        slug: s.slug,
        departmentId: departments[s.deptSlug],
      },
    });
    sectors[s.slug] = sector.id;
  }
  console.log(`  ✔ ${Object.keys(sectors).length} sectors`);

  // =========================================================================
  // 2b. AREAS (new — parallel to sectors during migration)
  // =========================================================================
  const areaData = [
    { name: 'Vendas', slug: 'vendas', deptSlug: 'comercial', sortOrder: 1 },
    { name: 'Gestão de Clientes', slug: 'gestao-clientes', deptSlug: 'comercial', sortOrder: 2 },
    { name: 'Suprimentos', slug: 'suprimentos', deptSlug: 'compras', sortOrder: 1 },
    { name: 'Catálogo', slug: 'catalogo', deptSlug: 'compras', sortOrder: 2 },
    { name: 'Fabricação', slug: 'fabricacao', deptSlug: 'producao', sortOrder: 1 },
    { name: 'Conferência e Entrega', slug: 'area-conferencia-entrega', deptSlug: 'producao', sortOrder: 2 },
    { name: 'Faturamento', slug: 'faturamento', deptSlug: 'financeiro', sortOrder: 1 },
    { name: 'Tesouraria', slug: 'tesouraria', deptSlug: 'financeiro', sortOrder: 2 },
    { name: 'Controladoria', slug: 'controladoria', deptSlug: 'financeiro', sortOrder: 3 },
  ] as const;

  const areas: Record<string, string> = {};
  for (const a of areaData) {
    const area = await prisma.area.upsert({
      where: { slug: a.slug },
      update: { name: a.name, departmentId: departments[a.deptSlug], sortOrder: a.sortOrder, isDefault: true },
      create: { name: a.name, slug: a.slug, departmentId: departments[a.deptSlug], sortOrder: a.sortOrder, isDefault: true },
    });
    areas[a.slug] = area.id;
  }
  console.log(`  ✔ ${Object.keys(areas).length} areas`);

  // =========================================================================
  // 2c. WORKFLOW STATUSES (per department — 4 default statuses each)
  // =========================================================================
  const defaultStatuses = [
    { name: 'Para Fazer', category: StatusCategory.NOT_STARTED, color: '#94a3b8', sortOrder: 1 },
    { name: 'Em Andamento', category: StatusCategory.ACTIVE, color: '#3b82f6', sortOrder: 1 },
    { name: 'Concluído', category: StatusCategory.DONE, color: '#22c55e', sortOrder: 1 },
    { name: 'Finalizado', category: StatusCategory.CLOSED, color: '#16a34a', sortOrder: 1 },
  ];

  for (const deptSlug of Object.keys(departments)) {
    const deptId = departments[deptSlug];
    const existingStatuses = await prisma.workflowStatus.count({ where: { departmentId: deptId } });
    if (existingStatuses === 0) {
      for (const status of defaultStatuses) {
        await prisma.workflowStatus.create({
          data: {
            name: status.name,
            category: status.category,
            color: status.color,
            sortOrder: status.sortOrder,
            departmentId: deptId,
            isDefault: true,
          },
        });
      }
    }
  }
  console.log('  ✔ default workflow statuses created');

  // =========================================================================
  // 3. PROCESSES
  // =========================================================================
  const processData = [
    { name: 'Pedidos', slug: 'processo-pedidos', sectorSlug: 'pedidos', areaSlug: 'vendas', deptSlug: 'comercial', featureRoute: '/comercial/pedidos', sortOrder: 1 },
    { name: 'Cadastro e Manutenção de Clientes', slug: 'cadastro-manutencao-clientes', sectorSlug: 'cadastro-clientes', areaSlug: 'gestao-clientes', deptSlug: 'comercial', featureRoute: '/comercial/clientes', sortOrder: 1 },
    { name: 'Gestão de Produtos', slug: 'gestao-produtos-processo', sectorSlug: 'gestao-produtos', areaSlug: 'catalogo', deptSlug: 'compras', featureRoute: '/compras/produtos', sortOrder: 1 },
    { name: 'Cotação e Compra de Matéria-Prima', slug: 'cotacao-compra-mp', sectorSlug: 'cotacao-compra', areaSlug: 'suprimentos', deptSlug: 'compras', featureRoute: '/compras/cotacoes', sortOrder: 1 },
    { name: 'Gestão de Fornecedores', slug: 'gestao-fornecedores-processo', sectorSlug: 'cotacao-compra', areaSlug: 'suprimentos', deptSlug: 'compras', featureRoute: '/compras/fornecedores', sortOrder: 2 },
    { name: 'Tabelas de Preço', slug: 'tabelas-preco-processo', sectorSlug: 'gestao-produtos', areaSlug: 'catalogo', deptSlug: 'compras', featureRoute: '/compras/tabelas-preco', sortOrder: 2 },
    { name: 'Requisições', slug: 'requisicoes-processo', sectorSlug: 'cotacao-compra', areaSlug: 'suprimentos', deptSlug: 'compras', featureRoute: '/compras/requisicoes', sortOrder: 3 },
    { name: 'Produção do Pedido', slug: 'producao-pedido-processo', sectorSlug: 'producao-pedido', areaSlug: 'fabricacao', deptSlug: 'producao', featureRoute: '/producao/ordens', sortOrder: 1 },
    { name: 'Conferência e Entrega', slug: 'conferencia-entrega-processo', sectorSlug: 'conferencia-entrega', areaSlug: 'area-conferencia-entrega', deptSlug: 'producao', featureRoute: null, sortOrder: 2 },
    { name: 'Emissão de NF', slug: 'emissao-nf-processo', sectorSlug: 'conciliacao-faturamento', areaSlug: 'faturamento', deptSlug: 'financeiro', featureRoute: '/financeiro/notas-fiscais', sortOrder: 1 },
    { name: 'Conciliação e Faturamento', slug: 'conciliacao-faturamento-processo', sectorSlug: 'conciliacao-faturamento', areaSlug: 'faturamento', deptSlug: 'financeiro', featureRoute: null, sortOrder: 2 },
    { name: 'Contas a Receber', slug: 'contas-receber-processo', sectorSlug: 'contas-receber', areaSlug: 'tesouraria', deptSlug: 'financeiro', featureRoute: '/financeiro/contas-a-receber', sortOrder: 1 },
    { name: 'Contas a Pagar', slug: 'contas-pagar-processo', sectorSlug: 'contas-pagar', areaSlug: 'tesouraria', deptSlug: 'financeiro', featureRoute: '/financeiro/contas-a-pagar', sortOrder: 2 },
    { name: 'Caixa', slug: 'caixa-processo', sectorSlug: 'contas-receber', areaSlug: 'tesouraria', deptSlug: 'financeiro', featureRoute: '/financeiro/caixa', sortOrder: 3 },
    { name: 'Controle e Análise Financeira', slug: 'controle-analise-financeira', sectorSlug: 'controle-financeiro', areaSlug: 'controladoria', deptSlug: 'financeiro', featureRoute: '/financeiro/analise', sortOrder: 1 },
  ] as const;

  const processes: Record<string, string> = {};
  for (const p of processData) {
    const proc = await prisma.process.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        sectorId: sectors[p.sectorSlug],
        departmentId: departments[p.deptSlug],
        areaId: areas[p.areaSlug],
        processType: ProcessType.BPM,
        featureRoute: p.featureRoute,
        isProtected: true,
        status: ProcessStatus.ACTIVE,
        sortOrder: p.sortOrder,
      },
      create: {
        name: p.name,
        slug: p.slug,
        sectorId: sectors[p.sectorSlug],
        departmentId: departments[p.deptSlug],
        areaId: areas[p.areaSlug],
        processType: ProcessType.BPM,
        featureRoute: p.featureRoute,
        isProtected: true,
        status: ProcessStatus.ACTIVE,
        sortOrder: p.sortOrder,
      },
    });
    processes[p.slug] = proc.id;
  }
  console.log(`  ✔ ${Object.keys(processes).length} processes`);

  // =========================================================================
  // 4. ACTIVITIES + 5. TASKS
  // =========================================================================
  interface ActivitySeed {
    processSlug: string;
    slug: string;
    name: string;
    ownerRole: Role;
    inputDescription: string;
    outputDescription: string;
    slaMinutes: number | null;
    exceptions: string;
    triggerOnStatus: OrderStatus | null;
    sortOrder: number;
    tasks: string[];
  }

  const activities: ActivitySeed[] = [
    // ------ Activity 1 ------
    {
      processSlug: 'processo-pedidos',
      slug: 'criar-pedido-elaborar-orcamento',
      name: 'Criar pedido e montar proposta',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Cliente identificado (cadastrado ou novo) + demanda verbalizada',
      outputDescription: 'Pedido com status EM_ORCAMENTO. Pode gerar PDF Proposta de Venda',
      slaMinutes: 120,
      exceptions: 'Cliente sem cadastro → cadastrar inline ou handoff. Produto sem preço → handoff para Gestão de Produtos',
      triggerOnStatus: OrderStatus.EM_ORCAMENTO,
      sortOrder: 1,
      tasks: [
        'Registrar cliente (se não cadastrado)',
        'Selecionar produtos da tabela de preços',
        'Definir quantidades',
        'Adicionar insumos/acabamentos por item',
        'Aplicar descontos se autorizados',
        'Preencher dados de entrega',
        'Definir prazo de entrega e validade da proposta',
        'Registrar observações',
      ],
    },
    // ------ Activity 2 ------
    {
      processSlug: 'processo-pedidos',
      slug: 'fechar-negocio-enviar-faturamento',
      name: 'Registrar fechamento e pagamento inicial',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Pedido em EM_ORCAMENTO + aceite do cliente',
      outputDescription: 'Pedido com status FATURAR + comprovante de pagamento 50%',
      slaMinutes: 240,
      exceptions: 'Cliente não paga os 50% → pedido permanece em EM_ORCAMENTO. Comprovante não anexado → sistema bloqueia avanço',
      triggerOnStatus: null,
      sortOrder: 2,
      tasks: [
        'Confirmar aceite do cliente',
        'Adicionar informações de pagamento',
        'Registrar valor pago (50% entrada)',
        'Anexar comprovante de pagamento',
        'Verificar dados cadastrais completos',
        'Mover para FATURAR',
      ],
    },
    // ------ Activity 5 ------
    {
      processSlug: 'cadastro-manutencao-clientes',
      slug: 'cadastrar-cliente',
      name: 'Cadastrar novo cliente no sistema',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Solicitação de cadastro (vinda do processo de Orçamento ou Pedidos)',
      outputDescription: 'Cliente cadastrado com todos os campos obrigatórios preenchidos',
      slaMinutes: 60,
      exceptions: 'CNPJ/CPF inválido → rejeitar cadastro. Cliente já existe → vincular ao existente',
      triggerOnStatus: null,
      sortOrder: 1,
      tasks: [
        'Coletar tipo pessoa (F/J)',
        'Preencher CPF/CNPJ e validar',
        'Preencher razão social e nome fantasia',
        'Preencher endereço completo',
        'Preencher contato (telefone, email)',
        'Definir classificação do cliente',
        'Definir rota de entrega',
        'Definir tabela de preços padrão',
      ],
    },
    // ------ Activity 6 ------
    {
      processSlug: 'gestao-produtos-processo',
      slug: 'cadastrar-produto-wizard',
      name: 'Cadastrar novo produto no catálogo',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Necessidade de novo produto (demanda de vendas ou produção)',
      outputDescription: 'Produto com status ACTIVE, disponível para venda',
      slaMinutes: 240,
      exceptions: 'NCM inválido → consultar contador. Produto Fabricação Própria sem fórmula → bloqueia ativação',
      triggerOnStatus: null,
      sortOrder: 1,
      tasks: [
        'Etapa 1 — Identificação: tipo, descrição, departamento, marca, unidade',
        'Etapa 2 — Especificação: dimensões, classificação, estoque mínimo',
        'Etapa 3 — Fiscal: NCM, origem, CFOP, IPI, tributação',
        'Etapa 4 — Precificação + Fórmula: custo, venda, tabela preço',
        'Upload de imagens',
        'Ativar produto (DRAFT → ACTIVE)',
      ],
    },
    // ------ Activity 7 ------
    {
      processSlug: 'gestao-produtos-processo',
      slug: 'manter-tabela-precos',
      name: 'Atualizar tabela de preços',
      ownerRole: Role.MANAGER,
      inputDescription: 'Alteração de custos ou decisão comercial de repricing',
      outputDescription: 'Tabela de preços atualizada e vigente',
      slaMinutes: 1440,
      exceptions: 'Redução de margem abaixo do mínimo → aprovação da diretoria',
      triggerOnStatus: null,
      sortOrder: 2,
      tasks: [
        'Identificar produtos afetados',
        'Calcular novo preço com base no custo',
        'Validar margem mínima',
        'Aplicar alteração na tabela',
        'Notificar equipe comercial',
      ],
    },
    // ------ Activity 8 ------
    {
      processSlug: 'cotacao-compra-mp',
      slug: 'solicitar-cotacao',
      name: 'Solicitar cotação a fornecedores',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Estoque abaixo do mínimo ou demanda de produção',
      outputDescription: 'Cotação vencedora selecionada',
      slaMinutes: 2880,
      exceptions: 'Nenhum fornecedor responde → escalar para gerente. Preço acima do orçamento → negociar',
      triggerOnStatus: null,
      sortOrder: 1,
      tasks: [
        'Identificar insumos necessários',
        'Selecionar fornecedores qualificados',
        'Enviar solicitação de cotação',
        'Registrar cotações recebidas',
        'Comparar preço/prazo/qualidade',
      ],
    },
    // ------ Activity 9 ------
    {
      processSlug: 'cotacao-compra-mp',
      slug: 'efetivar-compra',
      name: 'Efetivar pedido de compra ao fornecedor',
      ownerRole: Role.MANAGER,
      inputDescription: 'Cotação vencedora selecionada e aprovada',
      outputDescription: 'Pedido de compra emitido → AccountPayable criado automaticamente',
      slaMinutes: 240,
      exceptions: 'Fornecedor cancela → retornar para cotação',
      triggerOnStatus: null,
      sortOrder: 2,
      tasks: [
        'Aprovar cotação vencedora',
        'Emitir pedido de compra',
        'Confirmar prazo de entrega',
        'Registrar no contas a pagar',
      ],
    },
    // ------ Activity 10 ------
    {
      processSlug: 'producao-pedido-processo',
      slug: 'aceitar-pedido-iniciar-producao',
      name: 'Aceitar pedido e iniciar processos paralelos',
      ownerRole: Role.MANAGER,
      inputDescription: 'Pedido em PRODUZIR. ProductionOrder + SeparationOrder criadas automaticamente',
      outputDescription: 'Matéria-prima separada, pedido em EM_PRODUCAO, produção e separação em paralelo',
      slaMinutes: 240,
      exceptions: 'Matéria-prima insuficiente → notificar Compras (handoff para Cotação)',
      triggerOnStatus: OrderStatus.PRODUZIR,
      sortOrder: 1,
      tasks: [
        'Revisar ProductionOrder: itens, quantidades, fórmulas',
        'Revisar SeparationOrder (se existir)',
        'Consultar fórmula de produção',
        'Verificar disponibilidade de matéria-prima',
        'Reservar/separar matéria-prima',
        'Mover para EM_PRODUCAO',
      ],
    },
    // ------ Activity 11 ------
    {
      processSlug: 'producao-pedido-processo',
      slug: 'executar-producao',
      name: 'Executar produção conforme fórmula',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Matéria-prima separada, ProductionOrder em andamento',
      outputDescription: 'Produto(s) fabricado(s) com consumo real registrado. ProductionOrder COMPLETED',
      slaMinutes: null,
      exceptions: 'Perda de material → registrar em ProductionLoss. Problema de qualidade → retrabalho',
      triggerOnStatus: OrderStatus.EM_PRODUCAO,
      sortOrder: 2,
      tasks: [
        'Seguir fórmula de produção',
        'Registrar consumo real de cada matéria-prima',
        'Registrar quantidade produzida',
        'Registrar perdas se houver',
        'Colar etiqueta de produção no produto acabado',
      ],
    },
    // ------ Activity 11b ------
    {
      processSlug: 'producao-pedido-processo',
      slug: 'separar-itens-revenda',
      name: 'Separar itens de revenda/estoque',
      ownerRole: Role.OPERATOR,
      inputDescription: 'SeparationOrder criada automaticamente (se pedido tem itens revenda)',
      outputDescription: 'Itens de revenda separados e etiquetados. SeparationOrder SEPARATED',
      slaMinutes: 240,
      exceptions: 'Item não encontrado no estoque → notificar Compras',
      triggerOnStatus: OrderStatus.EM_PRODUCAO,
      sortOrder: 3,
      tasks: [
        'Consultar localização no estoque',
        'Separar fisicamente cada item',
        'Conferir quantidades',
        'Colar etiqueta de separação nos itens',
        'Marcar SeparationOrder como SEPARATED',
      ],
    },
    // ------ Activity 12 ------
    {
      processSlug: 'producao-pedido-processo',
      slug: 'controlar-qualidade-finalizar',
      name: 'Verificar qualidade e finalizar produção',
      ownerRole: Role.MANAGER,
      inputDescription: 'ProductionOrders COMPLETED + SeparationOrder SEPARATED (se existir)',
      outputDescription: 'Pedido PRODUZIDO → notifica conferência/entrega',
      slaMinutes: 120,
      exceptions: 'Item reprovado → retrabalho. Conferência de separação diverge → investigar',
      triggerOnStatus: null,
      sortOrder: 4,
      tasks: [
        'Inspecionar produtos fabricados',
        'Conferir itens separados (isChecked=true)',
        'Se reprovado, definir ação (retrabalho/descarte)',
        'Confirmar entrada no estoque de produto acabado',
        'Imprimir Ficha OP para arquivo',
        'Mover para PRODUZIDO',
      ],
    },
    // ------ Activity 13 ------
    {
      processSlug: 'conferencia-entrega-processo',
      slug: 'conferir-entregar-pedido',
      name: 'Conferir itens e entregar ao cliente',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Pedido com status PRODUZIDO + todos os itens e insumos prontos',
      outputDescription: 'Pedido com status ENTREGUE (final) → 2ª parcela AR registrada como PAID',
      slaMinutes: null,
      exceptions: 'Item faltante → retornar para produção. Cliente não paga 50% restante → reter entrega',
      triggerOnStatus: OrderStatus.PRODUZIDO,
      sortOrder: 1,
      tasks: [
        'Conferir cada produto contra o pedido',
        'Conferir acabamentos e insumos (checklist)',
        'Verificar embalagem',
        'Confirmar pagamento dos 50% restantes',
        'Registrar entrega',
        'Mover para ENTREGUE',
      ],
    },
    // ------ Activity 14 ------
    {
      processSlug: 'conciliacao-faturamento-processo',
      slug: 'conciliar-pagamento',
      name: 'Conciliar pagamento do pedido',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Pedido com status FATURAR + comprovante de pagamento (50%)',
      outputDescription: 'Pedido com status FATURADO → 1ª parcela do AR PAID → handoff para Produção',
      slaMinutes: 480,
      exceptions: 'Valor não confere → devolver para Comercial. Comprovante inválido → solicitar novo',
      triggerOnStatus: OrderStatus.FATURAR,
      sortOrder: 1,
      tasks: [
        'Acessar pedido no sistema',
        'Verificar comprovante de pagamento',
        'Conferir valor pago no extrato bancário',
        'Confirmar valor ≥50% do total',
        'Registrar conciliação no sistema',
        'Mover para FATURADO',
      ],
    },
    // ------ Activity 15 ------
    {
      processSlug: 'conciliacao-faturamento-processo',
      slug: 'gerar-nfe',
      name: 'Gerar nota fiscal eletrônica',
      ownerRole: Role.OPERATOR,
      inputDescription: 'Pedido FATURADO ou PRODUZIDO',
      outputDescription: 'NF-e autorizada com chave de acesso vinculada ao pedido',
      slaMinutes: 240,
      exceptions: 'SEFAZ rejeita → corrigir dados e retransmitir. Dados fiscais incompletos → devolver Comercial',
      triggerOnStatus: OrderStatus.FATURADO,
      sortOrder: 2,
      tasks: [
        'Verificar dados fiscais do cliente',
        'Verificar NCM e tributação de cada item',
        'Gerar XML da NF-e',
        'Transmitir para SEFAZ',
        'Registrar chave de acesso',
      ],
    },
    // ------ Activity 16 ------
    {
      processSlug: 'contas-receber-processo',
      slug: 'acompanhar-recebimento',
      name: 'Acompanhar recebimento de parcelas',
      ownerRole: Role.OPERATOR,
      inputDescription: 'AccountReceivable criado ao mover pedido para FATURAR (2 parcelas)',
      outputDescription: 'Parcela(s) com status PAID ou OVERDUE',
      slaMinutes: null,
      exceptions: 'Pagamento não identificado → contatar cliente. Inadimplência >30d → notificar Comercial',
      triggerOnStatus: null,
      sortOrder: 1,
      tasks: [
        'Verificar vencimentos do dia',
        'Conferir pagamentos recebidos',
        'Registrar pagamento parcial ou total',
        'Identificar inadimplentes',
        'Cobrar 50% restante na entrega',
      ],
    },
    // ------ Activity 17 ------
    {
      processSlug: 'contas-pagar-processo',
      slug: 'executar-pagamento',
      name: 'Executar pagamento a fornecedor',
      ownerRole: Role.OPERATOR,
      inputDescription: 'AccountPayable com vencimento próximo ou no dia',
      outputDescription: 'Parcela com status PAID + comprovante registrado',
      slaMinutes: null,
      exceptions: 'Saldo insuficiente → escalar para gerente financeiro',
      triggerOnStatus: null,
      sortOrder: 1,
      tasks: [
        'Verificar saldo disponível',
        'Confirmar dados bancários do fornecedor',
        'Executar transferência/boleto',
        'Registrar pagamento no sistema',
        'Anexar comprovante',
      ],
    },
    // ------ Activity 18 ------
    {
      processSlug: 'controle-analise-financeira',
      slug: 'reconciliar-caixa',
      name: 'Reconciliar caixa diário',
      ownerRole: Role.MANAGER,
      inputDescription: 'CashRegister aberto + movimentações do dia',
      outputDescription: 'Caixa fechado e reconciliado',
      slaMinutes: null,
      exceptions: 'Divergência não identificada → registrar como pendência para investigação',
      triggerOnStatus: null,
      sortOrder: 1,
      tasks: [
        'Conferir entradas do dia vs. recebíveis baixados',
        'Conferir saídas do dia vs. pagáveis baixados',
        'Identificar divergências',
        'Fechar caixa com saldo correto',
      ],
    },
  ];

  let activityCount = 0;
  let taskCount = 0;

  for (const a of activities) {
    const processId = processes[a.processSlug];
    if (!processId) {
      throw new Error(`Process not found for slug: ${a.processSlug}`);
    }

    const activity = await prisma.activity.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        processId,
        ownerRole: a.ownerRole,
        inputDescription: a.inputDescription,
        outputDescription: a.outputDescription,
        slaMinutes: a.slaMinutes,
        exceptions: a.exceptions,
        triggerOnStatus: a.triggerOnStatus,
        sortOrder: a.sortOrder,
      },
      create: {
        name: a.name,
        slug: a.slug,
        processId,
        ownerRole: a.ownerRole,
        inputDescription: a.inputDescription,
        outputDescription: a.outputDescription,
        slaMinutes: a.slaMinutes,
        exceptions: a.exceptions,
        triggerOnStatus: a.triggerOnStatus,
        sortOrder: a.sortOrder,
      },
    });

    await syncTasks(activity.id, a.tasks);
    activityCount++;
    taskCount += a.tasks.length;
  }

  console.log(`  ✔ ${activityCount} activities`);
  console.log(`  ✔ ${taskCount} tasks`);

  // =========================================================================
  // 6. HANDOFFS
  // =========================================================================

  // Handoff 1: Comercial → Financeiro (trigger: FATURAR)
  await upsertHandoff({
    fromProcessId: processes['processo-pedidos'],
    toProcessId: processes['conciliacao-faturamento-processo'],
    triggerOnStatus: OrderStatus.FATURAR,
    autoAdvance: true,
    validationRules: {
      required: [
        'clientId',
        'totalCents',
        'paidAmountCents',
        'paymentProofUrl',
        'paymentMethodId',
      ],
    },
  });

  // Handoff 2: Financeiro → Produção (trigger: FATURADO)
  await upsertHandoff({
    fromProcessId: processes['conciliacao-faturamento-processo'],
    toProcessId: processes['producao-pedido-processo'],
    triggerOnStatus: OrderStatus.FATURADO,
    autoAdvance: true,
    validationRules: {
      required: ['orderId', 'items', 'deliveryDeadline'],
    },
  });

  // Handoff 3: Compras → Financeiro (no OrderStatus trigger)
  await upsertHandoff({
    fromProcessId: processes['cotacao-compra-mp'],
    toProcessId: processes['contas-pagar-processo'],
    triggerOnStatus: null,
    autoAdvance: false,
    validationRules: {
      required: ['supplierId', 'totalCents', 'dueDate'],
    },
  });

  console.log('  ✔ 3 handoffs');
  console.log('✅ BPM seed complete.');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
