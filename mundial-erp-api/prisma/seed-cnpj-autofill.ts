import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CNPJ_AUTOFILL_FIELDS } from '../src/modules/custom-fields/cnpj-lookup/cnpj-autofill-fields';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const workspaces = await prisma.workspace.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  let created = 0;
  for (const ws of workspaces) {
    for (const spec of CNPJ_AUTOFILL_FIELDS) {
      const exists = await prisma.customFieldDefinition.count({
        where: {
          workspaceId: ws.id,
          autofillSource: spec.autofillSource,
          deletedAt: null,
        },
      });
      if (exists > 0) continue;
      await prisma.customFieldDefinition.create({
        data: {
          workspaceId: ws.id,
          key: spec.key,
          name: spec.label,
          label: spec.label,
          type: spec.type,
          required: false,
          isBuiltin: false,
          sortOrder: spec.sortOrder,
          autofillSource: spec.autofillSource,
        },
      });
      created += 1;
    }
  }

  console.log(
    `CNPJ autofill backfill: ${created} campo(s) criado(s) em ${workspaces.length} workspace(s)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
