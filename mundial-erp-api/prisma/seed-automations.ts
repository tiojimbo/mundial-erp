import 'dotenv/config';
import {
  AutomationScopeType,
  AutomationTrigger,
  PrismaClient,
  StatusCategory,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('='.repeat(60));
  console.log('  Sprint 7 — Seed Automations (BPM decommission)');
  console.log('='.repeat(60));

  const workspace = await prisma.workspace.findUnique({
    where: { slug: 'teste' },
  });
  if (!workspace) {
    throw new Error('Workspace `teste` nao existe. Rode seed:bpm-decommission antes.');
  }

  const admin = await prisma.user.findFirst({
    where: { email: 'admin@mundial.com.br' },
  });
  if (!admin) throw new Error('Admin user nao encontrado.');

  const space = await prisma.space.findUnique({
    where: { slug: 'teste-comercial' },
  });
  if (!space) throw new Error('Space `teste-comercial` nao existe.');

  const statusEmAndamento = await prisma.workflowStatus.findFirst({
    where: { spaceId: space.id, category: StatusCategory.ACTIVE, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });
  if (!statusEmAndamento) {
    throw new Error('WorkflowStatus ACTIVE nao encontrado no space teste-comercial.');
  }

  const listFaturamento = await prisma.list.findUnique({
    where: { slug: 'teste-faturamento' },
  });
  if (!listFaturamento) {
    throw new Error('List `teste-faturamento` nao existe.');
  }

  const name = 'Mover Pedido para Faturamento';
  const conditions = [
    { field: 'customTypeId', operator: 'EQ', value: 'builtin-order' },
    { field: 'statusId', operator: 'EQ', value: statusEmAndamento.id },
  ];
  const compiledActions = [
    { type: 'move_to_list', params: { listId: listFaturamento.id } },
  ];

  const existing = await prisma.automation.findFirst({
    where: { workspaceId: workspace.id, name, deletedAt: null },
  });

  if (existing) {
    await prisma.automation.update({
      where: { id: existing.id },
      data: {
        trigger: AutomationTrigger.TASK_STATUS_CHANGED,
        scopeType: AutomationScopeType.WORKSPACE,
        scopeId: null,
        conditions,
        compiledActions,
        isActive: true,
      },
    });
    console.log(`  [ok] Automation atualizada: ${name} (${existing.id})`);
  } else {
    const created = await prisma.automation.create({
      data: {
        workspaceId: workspace.id,
        createdById: admin.id,
        name,
        description:
          'Quando um Pedido (espelho) entra em status ACTIVE, move da lista Pedidos para Faturamento.',
        trigger: AutomationTrigger.TASK_STATUS_CHANGED,
        scopeType: AutomationScopeType.WORKSPACE,
        scopeId: null,
        conditions,
        compiledActions,
        isActive: true,
      },
    });
    console.log(`  [ok] Automation criada: ${name} (${created.id})`);
  }

  console.log('\n[ok] Seed Automations concluido.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
