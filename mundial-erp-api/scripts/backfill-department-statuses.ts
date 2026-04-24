/**
 * Backfill — Workflow statuses default para departments pre-existentes.
 *
 * Departments criados antes da logica de seed em DepartmentsService.create
 * nao receberam os 4 status default. Este script detecta departments sem
 * nenhum WorkflowStatus e cria os 4 defaults ("Para Fazer", "Em Andamento",
 * "Concluido", "Finalizado").
 *
 * Idempotente: reexecutar so insere para departments que continuam zerados.
 * Dry-run: flag --dry-run nao escreve nada, apenas loga totais.
 *
 * Uso:
 *   npm run backfill:department-statuses -- --dry-run
 *   npm run backfill:department-statuses
 */

import 'dotenv/config';
import { PrismaClient, StatusCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');

const DEFAULT_WORKFLOW_STATUSES = [
  { name: 'Para Fazer', category: StatusCategory.NOT_STARTED, color: '#94a3b8', sortOrder: 1 },
  { name: 'Em Andamento', category: StatusCategory.ACTIVE, color: '#3b82f6', sortOrder: 2 },
  { name: 'Concluído', category: StatusCategory.DONE, color: '#22c55e', sortOrder: 3 },
  { name: 'Finalizado', category: StatusCategory.CLOSED, color: '#16a34a', sortOrder: 4 },
] as const;

async function main() {
  console.log(`[backfill-department-statuses] start ${DRY_RUN ? '(dry-run)' : ''}`);

  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      workspaceId: true,
      _count: { select: { statuses: true } },
    },
  });

  const empty = departments.filter((d) => d._count.statuses === 0);
  console.log(
    `[backfill-department-statuses] ${departments.length} departments total, ${empty.length} sem statuses`,
  );

  let inserted = 0;
  for (const dept of empty) {
    console.log(`  → ${dept.name} (${dept.id})`);
    if (DRY_RUN) continue;
    await prisma.$transaction(async (tx) => {
      for (const status of DEFAULT_WORKFLOW_STATUSES) {
        await tx.workflowStatus.create({
          data: {
            name: status.name,
            category: status.category,
            color: status.color,
            sortOrder: status.sortOrder,
            isDefault: true,
            department: { connect: { id: dept.id } },
          },
        });
        inserted++;
      }
    });
  }

  console.log(
    `[backfill-department-statuses] done. ${inserted} statuses inseridos em ${empty.length} departments.`,
  );
}

main()
  .catch((err) => {
    console.error('[backfill-department-statuses] FAILED', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
