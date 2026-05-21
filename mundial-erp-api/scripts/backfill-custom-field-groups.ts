/**
 * Backfill — CustomFieldGroup a partir das colunas flat legadas.
 *
 * Sprint 4 do plano custom-fields-hoppe-parity: a tabela CustomFieldGroup
 * passa a ser a fonte da verdade. Defs antigas que ja agrupavam via
 * colunas flat (groupName, groupColor, groupPosition) precisam migrar:
 * pra cada tupla unica (workspaceId, groupName, color) criamos um row
 * em custom_field_groups e atualizamos definition.groupId.
 *
 * As colunas flat continuam existindo ate Sprint 7 (drop). Este script
 * NAO toca nas colunas flat — so popula o FK quando estiver vazio.
 *
 * Idempotente: reexecutar pula defs que ja tem groupId. Reusa group
 * existente quando ja existe (workspaceId, name) batendo.
 *
 * Uso:
 *   npx ts-node scripts/backfill-custom-field-groups.ts --dry-run
 *   npx ts-node scripts/backfill-custom-field-groups.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(
    `[backfill-custom-field-groups] start ${DRY_RUN ? '(dry-run)' : ''}`,
  );

  const orphans = await prisma.customFieldDefinition.findMany({
    where: {
      groupId: null,
      groupName: { not: null },
      workspaceId: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      workspaceId: true,
      groupName: true,
      groupColor: true,
      groupPosition: true,
    },
  });

  console.log(`  encontradas ${orphans.length} defs com flat sem FK`);

  if (orphans.length === 0) {
    console.log('[backfill-custom-field-groups] nada a fazer');
    await prisma.$disconnect();
    return;
  }

  const groupCache = new Map<string, string>();
  let groupsCreated = 0;
  let defsLinked = 0;

  for (const def of orphans) {
    const workspaceId = def.workspaceId!;
    const name = def.groupName!;
    const cacheKey = `${workspaceId}::${name}`;

    let groupId = groupCache.get(cacheKey) ?? null;

    if (!groupId) {
      const existing = await prisma.customFieldGroup.findFirst({
        where: { workspaceId, name },
        select: { id: true },
      });
      if (existing) {
        groupId = existing.id;
      } else if (!DRY_RUN) {
        const created = await prisma.customFieldGroup.create({
          data: {
            workspaceId,
            name,
            color: def.groupColor,
            position: def.groupPosition ?? 0,
          },
          select: { id: true },
        });
        groupId = created.id;
        groupsCreated += 1;
      } else {
        groupId = `dry-run-${cacheKey}`;
        groupsCreated += 1;
      }
      groupCache.set(cacheKey, groupId);
    }

    if (!DRY_RUN) {
      await prisma.customFieldDefinition.update({
        where: { id: def.id },
        data: { groupId },
      });
    }
    defsLinked += 1;
  }

  console.log(
    `[backfill-custom-field-groups] ${groupsCreated} groups criados, ${defsLinked} defs ligadas`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('[backfill-custom-field-groups] erro', error);
  process.exit(1);
});
