/**
 * Performance Fixture — Tasks (Sprint 8 R15)
 *
 * Gera um dataset sintetico de ~50.000 WorkItems + colaboracao para medicao
 * de latencia p95 em APIs de tasks/busca/feed. Usado junto com o script
 * `scripts/load-tasks-list.js` (k6) e `scripts/analyze-explain.ts`.
 *
 * NAO usa NestJS — PrismaClient direto via adapter `@prisma/adapter-pg`.
 *
 * Configuracao via env:
 *   FIXTURE_SIZE      total aproximado de work_items (default 50000).
 *   DATABASE_URL      conexao Postgres (obrigatoria).
 *
 * Distribuicao (aproximada):
 *   - Status category: 60% ACTIVE, 25% DONE, 10% NOT_STARTED, 5% CLOSED.
 *     (spec do Sprint fala em "CANCELLED" — o enum StatusCategory do
 *     schema.prisma so tem CLOSED; mapeamos CANCELLED -> CLOSED.)
 *   - 30% das tasks tem 1 assignee primario.
 *   - 10% tem multi-assignees adicionais (2-4).
 *   - 10% tem 1-3 tags.
 *   - 40% tem 1-3 checklists.
 *   - 20% tem 1-5 dependencies (ciclos auto-filtrados).
 *
 * Batches:
 *   Usa `$transaction` em blocos de BATCH_SIZE (1000) para nao estourar
 *   memoria. Inserts via `createMany`. Nested writes nao sao permitidos em
 *   createMany, entao assignees/tags/etc sao feitos em uma segunda fase por
 *   batch (recuperando IDs via findMany por titulo).
 *
 * Flags:
 *   --clean   deleta TUDO da fixture (workspace slug `perf-fixture`) antes
 *             de inserir. Use para rodar iterativamente sem duplicar.
 *
 * Idempotencia:
 *   - Workspace criado via upsert (slug `perf-fixture`).
 *   - Departments/Areas/Processes/Statuses/Tags criados via find-or-create.
 *   - WorkItems: se count atual >= FIXTURE_SIZE, encerra sem criar mais.
 *     Se for menor, cria o delta (parcialmente idempotente).
 *
 * Run:
 *   npm run perf:seed
 *   FIXTURE_SIZE=10000 npm run perf:seed
 *   npm run perf:seed -- --clean
 *
 * IMPORTANTE: NAO rodar em ambiente de producao. O script verifica
 * NODE_ENV !== 'production' e aborta caso contrario.
 */

import 'dotenv/config';
import {
  PrismaClient,
  Prisma,
  ProcessStatus,
  ProcessType,
  Role,
  StatusCategory,
  TaskPriority,
  WorkItemType,
  WorkspaceMemberRole,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------

const FIXTURE_SIZE = Number(process.env.FIXTURE_SIZE ?? 50_000);
const BATCH_SIZE = 1_000;

const DEPT_COUNT = 5;
const AREA_COUNT = 10;
const PROCESS_COUNT = 20;
const USER_COUNT = 25;
const TAG_COUNT = 30;

const FIXTURE_WORKSPACE = {
  name: 'Perf Fixture',
  slug: 'perf-fixture',
} as const;

const CLEAN_FLAG = process.argv.includes('--clean');

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.error('[seed-tasks-perf] ABORT: NODE_ENV=production detected.');
  process.exit(1);
}

// ----------------------------------------------------------------------------
// PRNG deterministico
// ----------------------------------------------------------------------------

function makePrng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = makePrng(0x5eed1234);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return out;
}

function pickStatusCategory(): StatusCategory {
  const r = rand();
  if (r < 0.6) return StatusCategory.ACTIVE;
  if (r < 0.85) return StatusCategory.DONE;
  if (r < 0.95) return StatusCategory.NOT_STARTED;
  return StatusCategory.CLOSED;
}

const PRIORITIES: TaskPriority[] = [
  TaskPriority.URGENT,
  TaskPriority.HIGH,
  TaskPriority.NORMAL,
  TaskPriority.LOW,
  TaskPriority.NONE,
];

// ----------------------------------------------------------------------------
// Prisma client
// ----------------------------------------------------------------------------

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ----------------------------------------------------------------------------
// Setup (idempotente)
// ----------------------------------------------------------------------------

async function ensureWorkspace(): Promise<{ id: string; ownerId: string }> {
  let owner = await prisma.user.findFirst({
    where: { role: Role.ADMIN, isActive: true, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner) {
    const hash = await bcrypt.hash('perf-fixture-password', 10);
    owner = await prisma.user.create({
      data: {
        email: 'perf-fixture-owner@example.local',
        name: 'Perf Fixture Owner',
        passwordHash: hash,
        role: Role.ADMIN,
      },
    });
  }

  const existing = await prisma.workspace.findUnique({
    where: { slug: FIXTURE_WORKSPACE.slug },
  });
  if (existing) return { id: existing.id, ownerId: owner.id };

  const ws = await prisma.workspace.create({
    data: {
      name: FIXTURE_WORKSPACE.name,
      slug: FIXTURE_WORKSPACE.slug,
      ownerId: owner.id,
    },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: owner.id } },
    update: { role: WorkspaceMemberRole.OWNER },
    create: {
      workspaceId: ws.id,
      userId: owner.id,
      role: WorkspaceMemberRole.OWNER,
    },
  });

  return { id: ws.id, ownerId: owner.id };
}

async function ensureUsers(workspaceId: string, count: number): Promise<string[]> {
  const existing = await prisma.user.findMany({
    where: { email: { startsWith: 'perf-user-' } },
    select: { id: true, email: true },
  });
  const byEmail = new Map(existing.map((u) => [u.email, u.id]));

  const need: { email: string; name: string }[] = [];
  for (let i = 0; i < count; i++) {
    const email = `perf-user-${i}@example.local`;
    if (!byEmail.has(email)) need.push({ email, name: `Perf User ${i}` });
  }

  if (need.length > 0) {
    const hash = await bcrypt.hash('perf-fixture-password', 10);
    await prisma.user.createMany({
      data: need.map((u) => ({
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: Role.OPERATOR,
      })),
      skipDuplicates: true,
    });
  }

  const all = await prisma.user.findMany({
    where: { email: { startsWith: 'perf-user-' } },
    select: { id: true },
    take: count,
    orderBy: { email: 'asc' },
  });

  await prisma.workspaceMember.createMany({
    data: all.map((u) => ({
      workspaceId,
      userId: u.id,
      role: WorkspaceMemberRole.MEMBER,
    })),
    skipDuplicates: true,
  });

  return all.map((u) => u.id);
}

async function ensureDepartments(
  workspaceId: string,
  count: number,
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const slug = `perf-dept-${i}`;
    const existing = await prisma.department.findUnique({ where: { slug } });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await prisma.department.create({
      data: {
        workspaceId,
        name: `Perf Department ${i}`,
        slug,
      },
    });
    ids.push(created.id);
  }
  return ids;
}

async function ensureAreas(departmentIds: string[], count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const slug = `perf-area-${i}`;
    const deptId = departmentIds[i % departmentIds.length]!;
    const existing = await prisma.area.findUnique({ where: { slug } });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await prisma.area.create({
      data: {
        name: `Perf Area ${i}`,
        slug,
        departmentId: deptId,
      },
    });
    ids.push(created.id);
  }
  return ids;
}

/**
 * Cria 4 statuses por department (NOT_STARTED, ACTIVE, DONE, CLOSED) para
 * satisfazer a FK de WorkItem.statusId. Retorna deptId -> {category -> statusId}.
 */
async function ensureStatuses(departmentIds: string[]): Promise<
  Map<string, Record<StatusCategory, string>>
> {
  const result = new Map<string, Record<StatusCategory, string>>();
  for (const deptId of departmentIds) {
    const categories: StatusCategory[] = [
      StatusCategory.NOT_STARTED,
      StatusCategory.ACTIVE,
      StatusCategory.DONE,
      StatusCategory.CLOSED,
    ];
    const byCategory = {} as Record<StatusCategory, string>;
    for (const cat of categories) {
      const name = `perf-${cat.toLowerCase()}`;
      const existing = await prisma.workflowStatus.findFirst({
        where: { departmentId: deptId, name },
      });
      if (existing) {
        byCategory[cat] = existing.id;
        continue;
      }
      const created = await prisma.workflowStatus.create({
        data: {
          name,
          category: cat,
          color: '#808080',
          departmentId: deptId,
        },
      });
      byCategory[cat] = created.id;
    }
    result.set(deptId, byCategory);
  }
  return result;
}

async function ensureProcesses(
  departmentIds: string[],
  areaIds: string[],
  count: number,
): Promise<{ id: string; departmentId: string }[]> {
  const result: { id: string; departmentId: string }[] = [];
  for (let i = 0; i < count; i++) {
    const slug = `perf-process-${i}`;
    const deptId = departmentIds[i % departmentIds.length]!;
    const areaId = areaIds[i % areaIds.length]!;
    const existing = await prisma.process.findUnique({ where: { slug } });
    if (existing) {
      result.push({
        id: existing.id,
        departmentId: existing.departmentId ?? deptId,
      });
      continue;
    }
    const created = await prisma.process.create({
      data: {
        name: `Perf Process ${i}`,
        slug,
        departmentId: deptId,
        areaId,
        processType: ProcessType.LIST,
        status: ProcessStatus.ACTIVE,
      },
    });
    result.push({ id: created.id, departmentId: deptId });
  }
  return result;
}

async function ensureTags(workspaceId: string, count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const name = `perf-tag-${i}`;
    const nameLower = name.toLowerCase();
    const existing = await prisma.workItemTag.findUnique({
      where: { workspaceId_nameLower: { workspaceId, nameLower } },
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await prisma.workItemTag.create({
      data: {
        workspaceId,
        name,
        nameLower,
        color: '#00AAFF',
      },
    });
    ids.push(created.id);
  }
  return ids;
}

// ----------------------------------------------------------------------------
// Clean
// ----------------------------------------------------------------------------

async function cleanFixture(): Promise<void> {
  const ws = await prisma.workspace.findUnique({
    where: { slug: FIXTURE_WORKSPACE.slug },
  });
  if (!ws) {
    console.log('[seed-tasks-perf] clean: fixture workspace nao existe, nada a fazer.');
    return;
  }

  console.log('[seed-tasks-perf] clean: apagando fixture existente...');

  const processes = await prisma.process.findMany({
    where: { slug: { startsWith: 'perf-process-' } },
    select: { id: true },
  });
  const processIds = processes.map((p) => p.id);

  // Work items (cascade remove assignees/watchers/tags/checklists/deps/etc
  // graças aos ON DELETE CASCADE em migrations 2/3).
  await prisma.workItem.deleteMany({
    where: { processId: { in: processIds } },
  });

  await prisma.workItemTag.deleteMany({
    where: { workspaceId: ws.id, nameLower: { startsWith: 'perf-tag-' } },
  });

  await prisma.process.deleteMany({
    where: { slug: { startsWith: 'perf-process-' } },
  });

  await prisma.workflowStatus.deleteMany({
    where: { name: { startsWith: 'perf-' } },
  });

  await prisma.area.deleteMany({
    where: { slug: { startsWith: 'perf-area-' } },
  });

  await prisma.department.deleteMany({
    where: { slug: { startsWith: 'perf-dept-' } },
  });

  await prisma.workspaceMember.deleteMany({
    where: { workspaceId: ws.id },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'perf-user-' } },
  });

  await prisma.workspace.delete({ where: { id: ws.id } });

  console.log('[seed-tasks-perf] clean: OK.');
}

// ----------------------------------------------------------------------------
// Batch builder
// ----------------------------------------------------------------------------

interface BatchExtras {
  title: string;
  primaryAssignee: string | null;
  extraAssignees: string[];
  tagIds: string[];
  checklistCount: number;
  dependencyCount: number;
}

function buildBatch(
  size: number,
  processes: { id: string; departmentId: string }[],
  statuses: Map<string, Record<StatusCategory, string>>,
  creatorId: string,
  users: string[],
  tags: string[],
  salt: number,
): {
  workItems: Prisma.WorkItemCreateManyInput[];
  extras: BatchExtras[];
} {
  const workItems: Prisma.WorkItemCreateManyInput[] = [];
  const extras: BatchExtras[] = [];

  for (let i = 0; i < size; i++) {
    const proc = pick(processes);
    const statusCat = pickStatusCategory();
    const statusId = statuses.get(proc.departmentId)![statusCat];
    const priority = pick(PRIORITIES);
    const title = `perf-task-${salt}-${i}-${Math.floor(rand() * 1e12)}`;

    workItems.push({
      processId: proc.id,
      title,
      description:
        rand() < 0.3
          ? `Descricao sintetica para ${title} — lorem ipsum dolor sit amet consectetur adipiscing.`
          : null,
      statusId,
      itemType: WorkItemType.TASK,
      priority,
      creatorId,
      completedAt: statusCat === StatusCategory.DONE ? new Date() : null,
      closedAt: statusCat === StatusCategory.CLOSED ? new Date() : null,
    });

    const hasPrimary = rand() < 0.3;
    const hasMulti = rand() < 0.1;
    const primaryAssignee = hasPrimary ? pick(users) : null;
    const extraAssignees = hasMulti
      ? pickN(
          users.filter((u) => u !== primaryAssignee),
          1 + Math.floor(rand() * 3),
        )
      : [];

    const hasTag = rand() < 0.1;
    const tagIds = hasTag ? pickN(tags, 1 + Math.floor(rand() * 3)) : [];

    const hasChecklist = rand() < 0.4;
    const checklistCount = hasChecklist ? 1 + Math.floor(rand() * 3) : 0;

    const hasDeps = rand() < 0.2;
    const dependencyCount = hasDeps ? 1 + Math.floor(rand() * 5) : 0;

    extras.push({
      title,
      primaryAssignee,
      extraAssignees,
      tagIds,
      checklistCount,
      dependencyCount,
    });
  }

  return { workItems, extras };
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function run(): Promise<void> {
  const t0 = Date.now();
  console.log(
    `[seed-tasks-perf] start — FIXTURE_SIZE=${FIXTURE_SIZE} clean=${CLEAN_FLAG}`,
  );

  if (CLEAN_FLAG) {
    await cleanFixture();
  }

  const workspace = await ensureWorkspace();
  console.log(`  workspace: ${workspace.id}`);

  const users = await ensureUsers(workspace.id, USER_COUNT);
  console.log(`  users: ${users.length}`);

  const departments = await ensureDepartments(workspace.id, DEPT_COUNT);
  console.log(`  departments: ${departments.length}`);

  const areas = await ensureAreas(departments, AREA_COUNT);
  console.log(`  areas: ${areas.length}`);

  const statuses = await ensureStatuses(departments);
  console.log(`  statuses: ${statuses.size} depts * 4 categorias`);

  const processes = await ensureProcesses(departments, areas, PROCESS_COUNT);
  console.log(`  processes: ${processes.length}`);

  const tagIds = await ensureTags(workspace.id, TAG_COUNT);
  console.log(`  tags: ${tagIds.length}`);

  const processIds = processes.map((p) => p.id);
  const currentCount = await prisma.workItem.count({
    where: { processId: { in: processIds } },
  });
  const toCreate = Math.max(0, FIXTURE_SIZE - currentCount);
  console.log(
    `  work_items existentes: ${currentCount}, alvo: ${FIXTURE_SIZE}, a criar: ${toCreate}`,
  );

  if (toCreate === 0) {
    console.log('[seed-tasks-perf] nada a criar. Done.');
    return;
  }

  const creatorId = users[0]!;
  const salt = Date.now();
  let created = 0;
  let batchIndex = 0;

  while (created < toCreate) {
    const batchSize = Math.min(BATCH_SIZE, toCreate - created);
    const batch = buildBatch(
      batchSize,
      processes,
      statuses,
      creatorId,
      users,
      tagIds,
      salt + batchIndex,
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.workItem.createMany({
          data: batch.workItems,
          skipDuplicates: true,
        });

        const titles = batch.workItems.map((w) => w.title);
        const rows = await tx.workItem.findMany({
          where: { title: { in: titles } },
          select: { id: true, title: true },
        });
        const idByTitle = new Map(rows.map((r) => [r.title, r.id]));

        const assigneeRows: Prisma.WorkItemAssigneeCreateManyInput[] = [];
        const tagRows: Prisma.WorkItemTagLinkCreateManyInput[] = [];
        const checklistRows: Prisma.WorkItemChecklistCreateManyInput[] = [];
        const dependencyRows: Prisma.WorkItemDependencyCreateManyInput[] = [];
        const createdIds: string[] = [];

        for (const item of batch.extras) {
          const wiId = idByTitle.get(item.title);
          if (!wiId) continue;
          createdIds.push(wiId);

          if (item.primaryAssignee) {
            assigneeRows.push({
              workItemId: wiId,
              userId: item.primaryAssignee,
              isPrimary: true,
            });
          }
          for (const uid of item.extraAssignees) {
            if (uid === item.primaryAssignee) continue;
            assigneeRows.push({
              workItemId: wiId,
              userId: uid,
              isPrimary: false,
            });
          }
          for (const tagId of item.tagIds) {
            tagRows.push({ workItemId: wiId, tagId });
          }
          for (let c = 0; c < item.checklistCount; c++) {
            checklistRows.push({
              workItemId: wiId,
              name: `checklist ${c}`,
              position: c,
            });
          }
        }

        if (createdIds.length > 1) {
          for (const item of batch.extras) {
            const fromId = idByTitle.get(item.title);
            if (!fromId) continue;
            for (let d = 0; d < item.dependencyCount; d++) {
              const toId =
                createdIds[Math.floor(rand() * createdIds.length)]!;
              if (toId === fromId) continue;
              dependencyRows.push({ fromTaskId: fromId, toTaskId: toId });
            }
          }
        }

        if (assigneeRows.length > 0) {
          await tx.workItemAssignee.createMany({
            data: assigneeRows,
            skipDuplicates: true,
          });
        }
        if (tagRows.length > 0) {
          await tx.workItemTagLink.createMany({
            data: tagRows,
            skipDuplicates: true,
          });
        }
        if (checklistRows.length > 0) {
          await tx.workItemChecklist.createMany({
            data: checklistRows,
            skipDuplicates: true,
          });
        }
        if (dependencyRows.length > 0) {
          await tx.workItemDependency.createMany({
            data: dependencyRows,
            skipDuplicates: true,
          });
        }
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

    created += batchSize;
    batchIndex += 1;
    if (created % (BATCH_SIZE * 5) === 0 || created === toCreate) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      const rate = (created / Number(elapsed)).toFixed(0);
      console.log(`  [+${created}/${toCreate}] ${elapsed}s  ~${rate} rows/s`);
    }
  }

  const durationMs = Date.now() - t0;
  console.log(
    `[seed-tasks-perf] OK: ${created} work_items criados em ${(durationMs / 1000).toFixed(1)}s`,
  );
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed-tasks-perf] FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
