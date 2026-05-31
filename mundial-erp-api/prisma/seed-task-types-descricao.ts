import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TYPE_IDS = [
  { id: 'cmppxu9h1004901qq8nwbwpo1', nome: 'Bug' },
  { id: 'cmppxyry7004b01qqhrwrlxzp', nome: 'Feature' },
  { id: 'cmpt5pq1x000u01qe76q1vvdx', nome: 'Otimização' },
];

const DEFAULT_HTML = '<p></p>';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  for (const tipo of TYPE_IDS) {
    const tt = await prisma.customTaskType.findUnique({
      where: { id: tipo.id },
    });
    if (!tt) {
      console.log(`SKIP ${tipo.nome}: tipo ${tipo.id} nao existe`);
      continue;
    }
    const template = await prisma.taskTypeTemplate.upsert({
      where: { customTaskTypeId: tipo.id },
      update: {
        hasDescription: true,
        defaultDescriptionHtml: DEFAULT_HTML,
      },
      create: {
        customTaskTypeId: tipo.id,
        hasDescription: true,
        defaultDescriptionHtml: DEFAULT_HTML,
      },
    });
    console.log(
      `OK ${tipo.nome} (${tipo.id}) template=${template.id} hasDescription=true`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
