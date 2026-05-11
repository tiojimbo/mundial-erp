import 'dotenv/config';
import {
  PrismaClient,
  ProcessStatus,
  ProcessType,
  StatusCategory,
  Visibility,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('='.repeat(60));
  console.log('  Sprint 7 — Seed Workspace Teste (BPM decommission)');
  console.log('='.repeat(60));

  const owner = await prisma.user.findFirst({
    where: { email: 'admin@mundial.com.br' },
  });
  if (!owner) {
    throw new Error('Admin user nao encontrado. Rode npm run seed:admin antes.');
  }

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'teste' },
    update: { name: 'Teste' },
    create: { name: 'Teste', slug: 'teste', ownerId: owner.id },
  });
  console.log(`  [ok] Workspace: ${workspace.name} (${workspace.id})`);

  const space = await prisma.space.upsert({
    where: { slug: 'teste-comercial' },
    update: { name: 'Comercial', workspaceId: workspace.id },
    create: {
      name: 'Comercial',
      slug: 'teste-comercial',
      workspaceId: workspace.id,
      creatorId: owner.id,
      visibility: Visibility.PUBLIC,
      isDefault: true,
      position: 1,
    },
  });
  console.log(`  [ok] Space: ${space.name} (${space.id})`);

  const statusesData = [
    { name: 'Aberto', category: StatusCategory.NOT_STARTED, color: '#94a3b8', sortOrder: 1 },
    { name: 'Em andamento', category: StatusCategory.ACTIVE, color: '#3b82f6', sortOrder: 2 },
    { name: 'Concluído', category: StatusCategory.DONE, color: '#22c55e', sortOrder: 3 },
  ];
  for (const s of statusesData) {
    const existing = await prisma.workflowStatus.findFirst({
      where: { spaceId: space.id, name: s.name },
    });
    if (existing) {
      await prisma.workflowStatus.update({
        where: { id: existing.id },
        data: { category: s.category, color: s.color, sortOrder: s.sortOrder },
      });
    } else {
      await prisma.workflowStatus.create({
        data: { ...s, spaceId: space.id, isDefault: true },
      });
    }
  }
  console.log(`  [ok] ${statusesData.length} workflow statuses`);

  const listsData = [
    { name: 'Pedidos', slug: 'teste-pedidos', position: 1 },
    { name: 'Faturamento', slug: 'teste-faturamento', position: 2 },
    { name: 'Produção', slug: 'teste-producao', position: 3 },
  ];
  for (const l of listsData) {
    await prisma.list.upsert({
      where: { slug: l.slug },
      update: { name: l.name, spaceId: space.id, position: l.position },
      create: {
        name: l.name,
        slug: l.slug,
        spaceId: space.id,
        processType: ProcessType.LIST,
        status: ProcessStatus.ACTIVE,
        position: l.position,
      },
    });
  }
  console.log(`  [ok] ${listsData.length} lists`);

  console.log('\n[ok] Seed Teste concluido.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
