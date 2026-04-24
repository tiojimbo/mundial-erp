/**
 * Prisma extension: primary-assignee-cache
 *
 * Este é o ÚNICO local autorizado a escrever em `WorkItem.primaryAssigneeCache`.
 * Intercepta mutações em `WorkItemAssignee` e, dentro da mesma transaction,
 * recalcula o primary assignee derivado e atualiza a coluna de cache.
 *
 * Ver ADR-001 (primary-assignee-cache) e PLANO-TASKS.md §5.4.
 *
 * Regra de derivação do primary:
 *   1. Preferir a linha com `isPrimary=true` (exclusiva por `workItemId` via
 *      unique partial index — garantido pela Migration 2).
 *   2. Fallback: a linha mais antiga por `assignedAt ASC` (promoção automática
 *      quando o primary é removido).
 *   3. Se não há mais assignees: `primaryAssigneeCache = NULL`.
 *
 * IMPORTANTE (estado atual):
 *   - A Migration 2 ainda NÃO adicionou a tabela `work_item_assignees` nem o
 *     model `WorkItemAssignee` ao Prisma client. Este arquivo é entregue
 *     assumindo que o client já expõe `workItemAssignee`. Erros de
 *     compilação aqui são ESPERADOS até a Migration 2 rodar e
 *     `prisma generate` atualizar os tipos. Felipe/Patricia desbloqueiam.
 *
 * Lint rule complementar: `no-direct-primary-assignee-cache-write` (este arquivo
 * é a única exceção permitida).
 */

import { Prisma } from '@prisma/client';

/**
 * Nome simbólico desta extension para logs/telemetria.
 */
export const PRIMARY_ASSIGNEE_CACHE_EXTENSION_NAME =
  'primary-assignee-cache' as const;

/**
 * Recalcula o `primaryAssigneeCache` do `workItemId` informado e persiste
 * o resultado em `work_items`. Espera receber o client/tx que está executando
 * a mutação original para que tudo fique dentro da mesma transaction.
 *
 * Exposta para consumo em healthchecks, backfill de emergência e testes.
 * Em produção, ninguém além da extension deve invocá-la — por isso a
 * prefixamos explicitamente com `__` e documentamos o escopo restrito.
 */
export async function __recalcPrimaryAssigneeCache(
  client: Prisma.TransactionClient | { workItemAssignee: unknown; workItem: unknown },
  workItemId: string,
): Promise<void> {
  const tx = client as Prisma.TransactionClient;
  // Preferir isPrimary=true; desempate por assignedAt ASC (promoção do mais antigo).
  const primary = await tx.workItemAssignee.findFirst({
    where: { workItemId },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
    select: { userId: true },
  });

  await tx.workItem.update({
    where: { id: workItemId },
    data: { primaryAssigneeCache: primary?.userId ?? null },
  });
}

/**
 * Tipos auxiliares — evita `any` nos hooks sem depender do shape exato do
 * Prisma namespace (que varia entre versões).
 */
interface QueryArgsWithWhere {
  where?: Record<string, unknown> & { workItemId?: string };
  data?: Record<string, unknown> & { workItemId?: string };
}

interface CreateManyArgs {
  data:
    | Array<Record<string, unknown> & { workItemId?: string }>
    | (Record<string, unknown> & { workItemId?: string });
}

type QueryCallback<Args, Result> = (args: Args) => Promise<Result>;

/**
 * Extrai os `workItemId` afetados por um args de query.
 * Cobre os 6 verbos interceptados: create / createMany / update / updateMany
 * / delete / deleteMany / upsert.
 */
async function collectAffectedWorkItemIds(
  model: 'workItemAssignee',
  operation: string,
  args: unknown,
  tx: Prisma.TransactionClient,
): Promise<Set<string>> {
  const ids = new Set<string>();

  switch (operation) {
    case 'create':
    case 'upsert': {
      const a = args as { create?: QueryArgsWithWhere; data?: QueryArgsWithWhere['data'] };
      const data = (a.create as QueryArgsWithWhere | undefined)?.data ?? a.data;
      if (data?.workItemId) ids.add(data.workItemId);
      break;
    }
    case 'update': {
      const a = args as QueryArgsWithWhere;
      // update pode mudar o workItemId — pegamos ambos (antes/depois).
      if (a.where?.workItemId) ids.add(a.where.workItemId);
      if (a.data?.workItemId) ids.add(a.data.workItemId);
      // Se `where` usa id único, precisamos consultar o row para descobrir workItemId.
      if (!a.where?.workItemId && a.where) {
        const row = await tx.workItemAssignee.findFirst({
          where: a.where as Prisma.WorkItemAssigneeWhereInput,
          select: { workItemId: true },
        });
        if (row?.workItemId) ids.add(row.workItemId);
      }
      break;
    }
    case 'updateMany': {
      const a = args as QueryArgsWithWhere;
      if (a.where?.workItemId) ids.add(a.where.workItemId);
      if (!a.where?.workItemId && a.where) {
        const rows = await tx.workItemAssignee.findMany({
          where: a.where as Prisma.WorkItemAssigneeWhereInput,
          select: { workItemId: true },
        });
        for (const r of rows) ids.add(r.workItemId);
      }
      break;
    }
    case 'delete': {
      const a = args as QueryArgsWithWhere;
      if (a.where?.workItemId) ids.add(a.where.workItemId);
      if (!a.where?.workItemId && a.where) {
        const row = await tx.workItemAssignee.findFirst({
          where: a.where as Prisma.WorkItemAssigneeWhereInput,
          select: { workItemId: true },
        });
        if (row?.workItemId) ids.add(row.workItemId);
      }
      break;
    }
    case 'deleteMany': {
      const a = args as QueryArgsWithWhere;
      if (a.where?.workItemId) ids.add(a.where.workItemId);
      if (!a.where?.workItemId && a.where) {
        const rows = await tx.workItemAssignee.findMany({
          where: a.where as Prisma.WorkItemAssigneeWhereInput,
          select: { workItemId: true },
        });
        for (const r of rows) ids.add(r.workItemId);
      }
      break;
    }
    case 'createMany': {
      const a = args as CreateManyArgs;
      const rows = Array.isArray(a.data) ? a.data : [a.data];
      for (const r of rows) {
        if (r.workItemId) ids.add(r.workItemId);
      }
      break;
    }
    default:
      break;
  }

  // silenciar lint sobre `model` não usado — guardamos para logs futuros.
  void model;
  return ids;
}

/**
 * Extension factory. Intercepta os hooks de query em `workItemAssignee` e
 * recalcula o cache no mesmo client/tx após a mutação original.
 */
export const primaryAssigneeCacheExtension = Prisma.defineExtension({
  name: PRIMARY_ASSIGNEE_CACHE_EXTENSION_NAME,
  query: {
    workItemAssignee: {
      async create<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        const result = await query(args);
        // Usa o próprio `this` (extended client/tx) para manter atomicidade.
        const affected = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'create',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        for (const id of affected) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },

      async createMany<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        const result = await query(args);
        const affected = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'createMany',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        for (const id of affected) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },

      async update<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        // Captura ids afetados ANTES da query (caso o where identifique o row).
        const before = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'update',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        const result = await query(args);
        for (const id of before) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },

      async updateMany<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        const before = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'updateMany',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        const result = await query(args);
        for (const id of before) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },

      async delete<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        // Precisamos descobrir o workItemId ANTES do delete.
        const before = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'delete',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        const result = await query(args);
        for (const id of before) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },

      async deleteMany<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        const before = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'deleteMany',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        const result = await query(args);
        for (const id of before) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },

      async upsert<T>(
        { args, query }: { args: unknown; query: QueryCallback<unknown, T> },
      ): Promise<T> {
        const before = await collectAffectedWorkItemIds(
          'workItemAssignee',
          'upsert',
          args,
          (this as unknown) as Prisma.TransactionClient,
        );
        const result = await query(args);
        for (const id of before) {
          await __recalcPrimaryAssigneeCache(
            (this as unknown) as Prisma.TransactionClient,
            id,
          );
        }
        return result;
      },
    },
  },
});
