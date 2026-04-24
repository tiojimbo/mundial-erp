/**
 * Backfill — Tasks feature (Sprint 1 TSK-108 + Sprint 2 continuation
 *                           + Sprint 3-4 Migration 3/3 tasks_advanced).
 *
 * Escopo atualizado pos Migration 3/3 (tasks_advanced):
 *   - Popula `work_item_assignees` (isPrimary=true) a partir de
 *     `work_items.primary_assignee_cache` (ON CONFLICT DO NOTHING).
 *   - Normaliza `work_item_tags.name_lower` (LOWER(name)) caso existam
 *     tags legadas — skippado se a tabela estiver vazia.
 *   - Popula `work_item_status_history` com 1 linha inicial por task
 *     existente (`enteredAt = work_items.created_at`, `leftAt = NULL`,
 *     `statusId = work_items.status_id`). Guard COUNT=0 por work_item:
 *     skip se ja existir qualquer linha de historia para aquela task.
 *
 * Idempotente: reexecutar nao escreve duplicado nem falha.
 * Dry-run: flag --dry-run nao escreve nada; apenas loga totais.
 *
 * Uso:
 *   npm run backfill:tasks-feature -- --dry-run
 *   npm run backfill:tasks-feature
 *
 * Ver PLANO-TASKS.md secao 5.5 e ADR-001.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');

interface StepTotals {
  workItemsWithPrimary: number;
  assigneeRowsInserted: number;
  assigneeRowsSkipped: number;
  tagNormalizations: number;
  statusHistoryRowsPrepared: number;
}

async function main(): Promise<void> {
  const startedAt = new Date();
  console.log('================================================================');
  console.log(' Backfill: Tasks feature — Migrations 1+2+3 (foundations + collab + advanced)');
  console.log(` Started:  ${startedAt.toISOString()}`);
  console.log(` Mode:     ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE'}`);
  console.log('================================================================');

  const totals: StepTotals = {
    workItemsWithPrimary: 0,
    assigneeRowsInserted: 0,
    assigneeRowsSkipped: 0,
    tagNormalizations: 0,
    statusHistoryRowsPrepared: 0,
  };

  // -------------------------------------------------------------------------
  // Etapa 1: popular work_item_assignees (isPrimary=true) a partir de
  // work_items.primary_assignee_cache.
  //
  // Pre-Migration 2: a tabela ainda nao existe; captura o erro e pula.
  // Pos-Migration 2: insercao em massa com ON CONFLICT DO NOTHING garante
  //                  idempotencia. assigned_at = work_items.created_at para
  //                  preservar a historia.
  // -------------------------------------------------------------------------
  console.log('\n[1/3] Populando work_item_assignees (isPrimary=true)...');
  const countWithPrimary = await prisma.workItem.count({
    where: { primaryAssigneeCache: { not: null }, deletedAt: null },
  });
  totals.workItemsWithPrimary = countWithPrimary;
  console.log(`       ${countWithPrimary} WorkItems com primaryAssigneeCache nao nulo.`);

  try {
    if (DRY_RUN) {
      // Simula contagem de quantas linhas NOVAS seriam inseridas
      // (excluindo as que ja existem).
      const pendingRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
        `SELECT COUNT(*)::bigint AS c
           FROM work_items wi
           LEFT JOIN work_item_assignees wia
             ON wia.work_item_id = wi.id AND wia.user_id = wi.primary_assignee_cache
          WHERE wi.primary_assignee_cache IS NOT NULL
            AND wi.deleted_at IS NULL
            AND wia.work_item_id IS NULL`
      );
      const pending = Number(pendingRows[0]?.c ?? 0n);
      totals.assigneeRowsInserted = pending;
      totals.assigneeRowsSkipped = countWithPrimary - pending;
      console.log(`       ${pending} linhas novas inseririam (dry-run); ${countWithPrimary - pending} ja existem.`);
    } else {
      // INSERT idempotente com ON CONFLICT DO NOTHING.
      // assigned_at = created_at do work_item para preservar semantica historica.
      const inserted = await prisma.$executeRawUnsafe(
        `INSERT INTO work_item_assignees (work_item_id, user_id, is_primary, assigned_at, assigned_by)
         SELECT wi.id, wi.primary_assignee_cache, true, wi.created_at, NULL
         FROM work_items wi
         WHERE wi.primary_assignee_cache IS NOT NULL
           AND wi.deleted_at IS NULL
         ON CONFLICT (work_item_id, user_id) DO NOTHING`
      );
      totals.assigneeRowsInserted = inserted;
      totals.assigneeRowsSkipped = countWithPrimary - inserted;
      console.log(`       ${inserted} linhas inseridas; ${countWithPrimary - inserted} ja existiam (skipped).`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`       pulado — tabela work_item_assignees ainda nao existe (Migration 2 pendente).`);
    console.log(`       detalhe: ${msg.split('\n')[0]}`);
  }

  // -------------------------------------------------------------------------
  // Etapa 2: normalizacao de work_item_tags.name_lower (LOWER(name)).
  // Pos-Migration 2 a tabela existe; se estiver vazia, nada a fazer.
  // -------------------------------------------------------------------------
  console.log('\n[2/3] Normalizacao WorkItemTag.nameLower...');
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT id, name FROM work_item_tags WHERE name_lower IS NULL OR name_lower <> LOWER(name)`
    );
    if (rows.length === 0) {
      console.log('       nada a normalizar.');
    } else if (DRY_RUN) {
      console.log(`       ${rows.length} tags normalizariam (dry-run).`);
    } else {
      for (const row of rows) {
        await prisma.$executeRawUnsafe(
          `UPDATE work_item_tags SET name_lower = LOWER(name) WHERE id = $1`,
          row.id
        );
      }
      console.log(`       ${rows.length} tags normalizadas.`);
    }
    totals.tagNormalizations = rows.length;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`       pulado — tabela work_item_tags ainda nao existe (Migration 2).`);
    console.log(`       detalhe: ${msg.split('\n')[0]}`);
  }

  // -------------------------------------------------------------------------
  // Etapa 3: status history — Migration 3/3 tasks_advanced.
  //
  // Para cada work_item nao-deletado cria 1 linha inicial em
  // work_item_status_history com:
  //   enteredAt       = work_items.created_at
  //   leftAt          = NULL
  //   durationSeconds = NULL
  //   statusId        = work_items.status_id
  //   byUserId        = work_items.creator_id
  //
  // Estrategia de idempotencia: guard COUNT=0 por work_item. A query so
  // insere linhas para tasks que ainda nao tem NENHUMA linha de historia
  // (NOT EXISTS). Reexecucao e no-op — nada duplica, nada falha.
  //
  // Protecao: se a tabela ainda nao existe (Migration 3 pendente), captura
  // o erro e pula a etapa.
  // -------------------------------------------------------------------------
  console.log('\n[3/3] Status history inicial (1 linha por task com enteredAt=createdAt)...');
  try {
    const preCount = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT COUNT(*)::bigint AS c FROM work_item_status_history`
    );
    const existing = Number(preCount[0]?.c ?? 0n);
    const totalWorkItems = await prisma.workItem.count({ where: { deletedAt: null } });

    // Guard COUNT=0: conta quantos work_items NAO tem nenhuma linha de
    // historia. Esse eh o numero real de insercoes necessarias (o total
    // pode ser maior que a diferenca se houver tasks com multiplas linhas).
    const pendingRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
      `SELECT COUNT(*)::bigint AS c
         FROM work_items wi
        WHERE wi.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM work_item_status_history sh
             WHERE sh.work_item_id = wi.id
          )`
    );
    const missing = Number(pendingRows[0]?.c ?? 0n);
    totals.statusHistoryRowsPrepared = missing;

    if (missing === 0) {
      console.log(`       ja coerente: ${existing} linhas p/ ${totalWorkItems} tasks (nada a fazer).`);
    } else if (DRY_RUN) {
      console.log(`       ${missing} tasks criariam linha de status history (dry-run).`);
    } else {
      // Insert idempotente com guard NOT EXISTS (equivalente a COUNT=0 por work_item).
      const inserted = await prisma.$executeRawUnsafe(
        `INSERT INTO work_item_status_history (id, work_item_id, status_id, entered_at, left_at, duration_seconds, by_user_id)
         SELECT gen_random_uuid()::text, wi.id, wi.status_id, wi.created_at, NULL, NULL, wi.creator_id
         FROM work_items wi
         WHERE wi.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM work_item_status_history sh
             WHERE sh.work_item_id = wi.id
           )`
      );
      console.log(`       inseridas ${inserted} linhas em work_item_status_history.`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`       pulado — tabela work_item_status_history ainda nao existe (Migration 3).`);
    console.log(`       detalhe: ${msg.split('\n')[0]}`);
  }

  // -------------------------------------------------------------------------
  // Relatorio final
  // -------------------------------------------------------------------------
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  console.log('\n================================================================');
  console.log(' Backfill — resumo');
  console.log('================================================================');
  console.log(` workItems c/ primaryAssigneeCache    : ${totals.workItemsWithPrimary}`);
  console.log(` WorkItemAssignee inseridos           : ${totals.assigneeRowsInserted}`);
  console.log(` WorkItemAssignee skippados (ON CONFL): ${totals.assigneeRowsSkipped}`);
  console.log(` WorkItemTag normalizations           : ${totals.tagNormalizations}`);
  console.log(` WorkItemStatusHistory rows preparadas: ${totals.statusHistoryRowsPrepared}`);
  console.log(` Duracao                              : ${durationMs} ms`);
  console.log(` Mode                                 : ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(` Finished                             : ${finishedAt.toISOString()}`);
  console.log('================================================================');
}

main()
  .catch((err: unknown) => {
    console.error('\n[backfill-tasks-feature] FALHA:');
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
