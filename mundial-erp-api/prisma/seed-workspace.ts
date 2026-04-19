/**
 * Workspace Foundation Seed (Migration 2 — data migration)
 *
 * Standalone script that:
 *   1. Creates the default workspace ("Mundial Telhas")
 *   2. Backfills `workspace_id` on all 23 workspace-scoped tables
 *   3. Inserts a WorkspaceMember row for every existing User, mapping the
 *      legacy `Role` enum to `WorkspaceMemberRole`
 *   4. Sets `User.lastAccessedWorkspaceId` to the default workspace
 *
 * Idempotent — checks existence via `findUnique({ where: { slug } })`.
 *
 * Run: npm run seed:workspace
 *
 * IMPORTANT: this seed MUST run after the `workspace_foundation` migration
 * and BEFORE the `workspace_required` migration (which makes `workspace_id`
 * NOT NULL). See `prisma/migrations/<timestamp>_workspace_required/`.
 */

import 'dotenv/config';
import { PrismaClient, Role, WorkspaceMemberRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Safeguard CTO: nao deixar rodar acidentalmente com a feature flag
// desligada. Alguem pode subir M3 (NOT NULL) sem ter ligado a flag e ter
// rodado o seed antes — o release-workspace.sh tem o mesmo check, mas
// rodar npm run seed:workspace direto pula essa salvaguarda.
if (process.env.MULTI_WORKSPACE_ENABLED !== 'true') {
  // eslint-disable-next-line no-console
  console.error(
    '[seed-workspace] ABORT: MULTI_WORKSPACE_ENABLED nao esta "true". ' +
      'Habilite a feature flag antes de rodar o seed (vide ADR-001).',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEFAULT_WORKSPACE = {
  name: 'Mundial Telhas',
  slug: 'mundial-telhas',
} as const;

/**
 * 23 tabelas que receberam `workspace_id` na Migration 1.
 * A ordem aqui nao importa pois sao UPDATEs independentes.
 */
const WORKSPACE_SCOPED_TABLES = [
  'departments',
  'status_templates',
  'clients',
  'client_classifications',
  'delivery_routes',
  'suppliers',
  'product_types',
  'products',
  'unit_measures',
  'brands',
  'product_departments',
  'price_tables',
  'companies',
  'payment_methods',
  'carriers',
  'dashboards',
  'orders',
  'order_types',
  'order_flows',
  'order_models',
  'financial_categories',
  'audit_logs',
  'chat_channels',
] as const;

/**
 * Map legacy `Role` -> `WorkspaceMemberRole`.
 * O primeiro ADMIN vira OWNER; demais ADMINs viram ADMIN.
 */
function mapRole(role: Role, isFirstAdmin: boolean): WorkspaceMemberRole {
  switch (role) {
    case Role.ADMIN:
      return isFirstAdmin ? WorkspaceMemberRole.OWNER : WorkspaceMemberRole.ADMIN;
    case Role.MANAGER:
      return WorkspaceMemberRole.ADMIN;
    case Role.OPERATOR:
      return WorkspaceMemberRole.MEMBER;
    case Role.VIEWER:
      return WorkspaceMemberRole.GUEST;
    default:
      return WorkspaceMemberRole.MEMBER;
  }
}

async function main() {
  console.log('Workspace Foundation seed starting ...');

  // ---------- Idempotencia ---------------------------------------------------
  const existing = await prisma.workspace.findUnique({
    where: { slug: DEFAULT_WORKSPACE.slug },
  });
  if (existing) {
    console.log(
      `  Workspace "${DEFAULT_WORKSPACE.slug}" ja existe (id=${existing.id}). Nada a fazer.`,
    );
    return;
  }

  // ---------- Resolver owner -------------------------------------------------
  const adminUsers = await prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const owner = adminUsers[0]
    ?? (await prisma.user.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    }));

  if (!owner) {
    throw new Error(
      'Nenhum User encontrado para ser ownerId do workspace default. Execute `npm run seed:admin` antes deste script.',
    );
  }
  console.log(`  Owner resolvido: ${owner.email} (id=${owner.id}, role=${owner.role})`);

  // ---------- Carregar todos os users (uma vez) ------------------------------
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true },
  });
  console.log(`  ${allUsers.length} users encontrados para mapear como membros.`);

  // ---------- Transacao atomica ---------------------------------------------
  await prisma.$transaction(async (tx) => {
    // 1) Cria workspace default
    const workspace = await tx.workspace.create({
      data: {
        name: DEFAULT_WORKSPACE.name,
        slug: DEFAULT_WORKSPACE.slug,
        ownerId: owner.id,
      },
    });
    console.log(`  Workspace criado: ${workspace.name} (id=${workspace.id})`);

    // 2) Backfill workspace_id em batch nas 23 tabelas
    let totalUpdated = 0;
    for (const table of WORKSPACE_SCOPED_TABLES) {
      // `Prisma.sql` template tags nao aceitam identifiers — usamos string
      // interpolation controlada (whitelist acima) para o nome da tabela.
      const sql = `UPDATE "${table}" SET "workspace_id" = $1 WHERE "workspace_id" IS NULL`;
      const updated = await tx.$executeRawUnsafe(sql, workspace.id);
      console.log(`    UPDATE ${table.padEnd(28)} -> ${updated} rows`);
      totalUpdated += updated;
    }
    console.log(`  Total de rows atualizadas: ${totalUpdated}`);

    // 3) Inserir WorkspaceMember para cada user
    let firstAdminAssigned = false;
    const memberRows = allUsers.map((u) => {
      const isFirstAdmin = u.role === Role.ADMIN && !firstAdminAssigned;
      if (isFirstAdmin) firstAdminAssigned = true;
      return {
        workspaceId: workspace.id,
        userId: u.id,
        role: mapRole(u.role, isFirstAdmin),
      };
    });

    if (memberRows.length > 0) {
      await tx.workspaceMember.createMany({
        data: memberRows,
        skipDuplicates: true,
      });
      console.log(`  ${memberRows.length} WorkspaceMember rows inseridos.`);
    }

    // 4) Atualiza User.lastAccessedWorkspaceId para todos os users
    const userIds = allUsers.map((u) => u.id);
    if (userIds.length > 0) {
      const updatedUsers = await tx.user.updateMany({
        where: { id: { in: userIds } },
        data: { lastAccessedWorkspaceId: workspace.id },
      });
      console.log(`  ${updatedUsers.count} users com lastAccessedWorkspaceId atualizado.`);
    }
  });

  console.log('Workspace Foundation seed completo.');
}

main()
  .catch((e) => {
    console.error('SEED FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
