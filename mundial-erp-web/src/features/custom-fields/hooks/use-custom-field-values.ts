'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { customFieldValuesService } from '../services/custom-field-values.service';
import type {
  CustomFieldRawValue,
  CustomFieldValue,
} from '../types/custom-field.types';

/**
 * Sprint 2 (TTT-020) — Hooks de valores de custom fields.
 *
 * `queryKey`: `[workspaceId, 'custom-field-values', taskId]`. Workspace
 * prefix garante isolamento entre tenants (mesmo padrao adotado em
 * `taskQueryKeys`). Stale 30s alinhado com PLANO §"Hooks".
 *
 * O `usePatchCustomFieldValue` aplica optimistic update + rollback em erro
 * (ex.: 422 do dispatcher de validacao do backend) + toast.
 */

export const customFieldValuesQueryKeys = {
  all: (workspaceId: string) =>
    [workspaceId, 'custom-field-values'] as const,
  byTask: (workspaceId: string, taskId: string) =>
    [...customFieldValuesQueryKeys.all(workspaceId), taskId] as const,
};

export const CUSTOM_FIELD_VALUES_STALE_TIME_MS = 30_000;

export function useCustomFieldValues(taskId: string | undefined) {
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useQuery({
    queryKey: customFieldValuesQueryKeys.byTask(workspaceId, taskId ?? ''),
    queryFn: () => customFieldValuesService.listForTask(taskId as string),
    enabled: Boolean(workspaceId) && Boolean(taskId),
    staleTime: CUSTOM_FIELD_VALUES_STALE_TIME_MS,
  });
}

export interface PatchCustomFieldValueArgs {
  taskId: string;
  definitionId: string;
  value: CustomFieldRawValue;
}

type PatchContext = {
  previous: CustomFieldValue[] | undefined;
  queryKey: ReturnType<typeof customFieldValuesQueryKeys.byTask>;
};

/**
 * Mutation com optimistic update + rollback em erro.
 *
 * Estrategia:
 *  1. Cancela queries em voo da lista da task.
 *  2. Snapshot da lista atual (`previous`).
 *  3. Patcha a entrada correspondente com o valor escalar local — feedback
 *     imediato ao usuario.
 *  4. `onError`: restaura snapshot + toast.
 *  5. `onSuccess`: substitui a entrada pelo DTO autoritativo do backend
 *     (ja inclui a `definition` joinada e `updatedAt` real).
 *  6. `onSettled`: invalida a key para reconciliar com SSE futuro / outras
 *     instancias do hook na mesma view.
 *
 * Limitacao MVP: se a definition AINDA nao tem entrada na lista (primeiro
 * PATCH para a task), nao temos como sintetizar `id`/`createdAt` no
 * optimistic — nesse caso, o snapshot nao inclui a row e o usuario verao
 * apenas pos-success. Aceitavel ate `CustomFieldsSection` carregar todas
 * as definitions no GET (ja faz, via DTO joinado).
 */
export function usePatchCustomFieldValue() {
  const qc = useQueryClient();
  const workspaceId = useWorkspaceStore(
    (state) => state.currentWorkspace?.id ?? '',
  );

  return useMutation<
    CustomFieldValue,
    Error,
    PatchCustomFieldValueArgs,
    PatchContext
  >({
    mutationKey: [workspaceId, 'custom-field-values', 'patch'],
    mutationFn: ({ taskId, definitionId, value }) =>
      customFieldValuesService.setValue(taskId, definitionId, value),

    onMutate: async ({ taskId, definitionId, value }) => {
      const queryKey = customFieldValuesQueryKeys.byTask(workspaceId, taskId);
      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData<CustomFieldValue[]>(queryKey);

      if (previous) {
        const optimistic = previous.map((entry) =>
          entry.definitionId === definitionId
            ? {
                ...entry,
                value: toScalarOptimistic(value, entry),
                updatedAt: new Date().toISOString(),
              }
            : entry,
        );
        qc.setQueryData<CustomFieldValue[]>(queryKey, optimistic);
      }

      return { previous, queryKey };
    },

    onError: (err, _vars, ctx) => {
      if (ctx?.previous && ctx.queryKey) {
        qc.setQueryData(ctx.queryKey, ctx.previous);
      }
      toast.error(err.message || 'Erro ao atualizar campo personalizado');
    },

    onSuccess: (server, { taskId }) => {
      const queryKey = customFieldValuesQueryKeys.byTask(workspaceId, taskId);
      const current = qc.getQueryData<CustomFieldValue[]>(queryKey);
      if (!current) return;

      const exists = current.some((entry) => entry.id === server.id);
      const next = exists
        ? current.map((entry) => (entry.id === server.id ? server : entry))
        : [...current, server];

      qc.setQueryData<CustomFieldValue[]>(queryKey, next);
    },

    onSettled: (_data, _err, { taskId }) => {
      qc.invalidateQueries({
        queryKey: customFieldValuesQueryKeys.byTask(workspaceId, taskId),
      });
    },
  });
}

/**
 * Converte o valor cru aceito pela API para o escalar exibivel na lista
 * da task — espelha `pickScalarValue` do backend.
 *
 * `Date` -> ISO string. `boolean` nao e tipo suportado pelos `CustomFieldType`
 * atuais, mas como o body aceita `boolean | null` em SetCustomFieldValueDto,
 * normalizamos para string para nao quebrar a UI optimistica em testes.
 */
function toScalarOptimistic(
  value: CustomFieldRawValue,
  reference: CustomFieldValue,
): CustomFieldValue['value'] {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  // Fallback defensivo: mantem valor anterior em vez de explodir o tipo.
  return reference.value;
}
