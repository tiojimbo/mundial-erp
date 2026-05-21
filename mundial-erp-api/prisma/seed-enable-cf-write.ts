import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const workspaces = await prisma.workspace.findMany();
  let updated = 0;
  for (const ws of workspaces) {
    const current = (ws.settings ?? {}) as Record<string, unknown>;
    if (current.featureCustomFieldsWriteEnabled === true) continue;
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { settings: { ...current, featureCustomFieldsWriteEnabled: true } },
    });
    updated++;
    console.log(`CF write habilitado em workspace ${ws.id} (${ws.name})`);
  }
  console.log(`Total: ${updated} workspace(s) atualizado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
