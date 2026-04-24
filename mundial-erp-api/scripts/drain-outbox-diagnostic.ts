import 'dotenv/config';
import { PrismaClient, TaskActivityType, OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const counts0 = {
    activities: await prisma.workItemActivity.count(),
    pending: await prisma.taskOutboxEvent.count({ where: { status: 'PENDING' } }),
    failed: await prisma.taskOutboxEvent.count({ where: { status: 'FAILED' } }),
    completed: await prisma.taskOutboxEvent.count({ where: { status: 'COMPLETED' } }),
    tasks: await prisma.workItem.count({ where: { deletedAt: null } }),
  };
  console.log('[antes]', counts0);

  const validTypes = new Set(Object.values(TaskActivityType) as string[]);
  const pending = await prisma.taskOutboxEvent.findMany({
    where: { status: { in: ['PENDING', 'FAILED'] as OutboxEventStatus[] } },
    orderBy: { createdAt: 'asc' },
  });

  let projected = 0;
  let skipped = 0;
  for (const ev of pending) {
    if (!validTypes.has(ev.eventType)) {
      skipped++;
      continue;
    }
    const payload = (ev.payload ?? {}) as { actorId?: string };
    const actorId = typeof payload.actorId === 'string' ? payload.actorId : null;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.workItemActivity.create({
          data: {
            workItemId: ev.aggregateId,
            type: ev.eventType as TaskActivityType,
            actorId,
            payload: ev.payload as Prisma.InputJsonValue,
            createdAt: ev.createdAt,
          },
        });
        await tx.taskOutboxEvent.update({
          where: { id: ev.id },
          data: { status: 'COMPLETED', processedAt: new Date() },
        });
      });
      projected++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[skip] ${ev.id} (${ev.eventType}): ${msg.slice(0, 120)}`);
      skipped++;
    }
  }

  const counts1 = {
    activities: await prisma.workItemActivity.count(),
    pending: await prisma.taskOutboxEvent.count({ where: { status: 'PENDING' } }),
    failed: await prisma.taskOutboxEvent.count({ where: { status: 'FAILED' } }),
    completed: await prisma.taskOutboxEvent.count({ where: { status: 'COMPLETED' } }),
    tasks: await prisma.workItem.count({ where: { deletedAt: null } }),
  };
  console.log('[depois]', { ...counts1, projected, skipped });

  const tasks = await prisma.workItem.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const acts = await prisma.workItemActivity.groupBy({
    by: ['workItemId'],
    _count: { _all: true },
  });
  const map = new Map(acts.map((a) => [a.workItemId, a._count._all]));
  console.log('\n[por task]');
  for (const t of tasks) {
    const n = map.get(t.id) ?? 0;
    console.log(`  ${n.toString().padStart(3)} activities | ${t.id} | ${t.title.slice(0, 50)}`);
  }

  // Lista tipos de activity presentes
  const byType = await prisma.workItemActivity.groupBy({
    by: ['type'],
    _count: { _all: true },
  });
  console.log('\n[por tipo]');
  for (const t of byType) console.log(`  ${t._count._all.toString().padStart(3)} ${t.type}`);

  // Mapeia cada task ao workspaceId via Process -> Department
  const tasksWs = await prisma.workItem.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      process: { select: { department: { select: { workspaceId: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n[task -> workspace]');
  for (const t of tasksWs) {
    const ws = t.process?.department?.workspaceId ?? 'NULL';
    const dp = t.process?.department?.name ?? '?';
    console.log(`  ${t.id} | ws=${ws} | dept=${dp} | ${t.title.slice(0, 40)}`);
  }

  // Lista workspaces existentes
  const ws = await prisma.workspace.findMany({
    select: { id: true, slug: true, name: true },
  });
  console.log('\n[workspaces]');
  for (const w of ws) console.log(`  ${w.id} | ${w.slug} | ${w.name}`);

  // Simula exatamente a query do repository.findByTask
  const testTaskId = 'cmo96vixi002nqcvyzjj0au23';
  const testWorkspaceId = 'cmo73xto10000q8vyhgj1off4';
  console.log(`\n[simulando findByTask taskId=${testTaskId} ws=${testWorkspaceId}]`);
  const items = await prisma.workItemActivity.findMany({
    where: {
      workItemId: testTaskId,
      workItem: { process: { department: { workspaceId: testWorkspaceId } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      workItemId: true,
      type: true,
      actorId: true,
      payload: true,
      createdAt: true,
    },
  });
  console.log(`  items retornados: ${items.length}`);
  for (const it of items) {
    console.log(`    ${it.id} | ${it.type} | actor=${it.actorId} | ${it.createdAt.toISOString()}`);
    console.log(`      payload=${JSON.stringify(it.payload).slice(0, 200)}`);
  }
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
