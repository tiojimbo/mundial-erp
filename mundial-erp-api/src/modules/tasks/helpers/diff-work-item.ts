/**
 * diff-work-item — funcao pura (sem @Injectable, sem DI) que compara o estado
 * anterior de uma WorkItem (task) contra o `patch` que sera aplicado, e
 * produz a lista de eventos de outbox correspondentes as mudancas semanticas.
 *
 * Regras:
 *   - Idempotencia: valor igual = 0 eventos (nao enfileirar).
 *   - Datas comparadas por `.getTime()` (mesma instancia em ms); null sem mudanca
 *     -> 0 evento; transicoes null<->Date sao eventos.
 *   - `description` e `markdownContent` colapsam num unico `DESCRIPTION_CHANGED`
 *     (nunca incluir o texto no payload — LGPD/body logging).
 *   - `archived` gera `ARCHIVED` (false->true) ou `UNARCHIVED` (true->false).
 *   - Todos os payloads carregam `actorId` + `workspaceId` para correlacao
 *     no worker e na projecao do activity feed (ADR-002).
 *
 * Referencias:
 *   - ADR-003 (outbox pattern para side-effects).
 *   - ADR-002 (activity feed como projecao assincrona).
 *   - PLANO-TASKS §8.11 (outbox rules) / §8.12 (notificacoes).
 *
 * Usado por `TasksService.update()` dentro da `$transaction` primaria.
 */
import { Prisma, TaskPriority } from '@prisma/client';
import type { TaskOutboxEventType } from '../../task-outbox/task-outbox.constants';

/**
 * Shape da leitura `before` — subset minimo do WorkItem que cobre os 9 campos
 * semanticamente interessantes para o diff. Fonte: `TasksRepository.findForDiff`.
 */
export type WorkItemDiffRow = {
  id: string;
  title: string;
  description: string | null;
  markdownContent: string | null;
  statusId: string;
  priority: TaskPriority;
  dueDate: Date | null;
  startDate: Date | null;
  points: number | null;
  archived: boolean;
  customTypeId: string | null;
};

/**
 * Evento derivado do diff. `payload` segue o contrato esperado pelos handlers
 * do worker (`TASK_OUTBOX_EVENT_TYPES`). Nunca inclui body de descricao/markdown.
 */
export type DiffEvent = {
  eventType: TaskOutboxEventType;
  payload: Record<string, unknown>;
};

/**
 * Converte Date|null em ISO string | null (usado nos payloads).
 */
function toIsoOrNull(value: Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toISOString();
}

/**
 * Normaliza o valor `patch[field]` (que pode ser um literal, um `{ set: v }`
 * ou `undefined`) para o valor escalar final que sera gravado. Retorna
 * `undefined` quando o patch nao toca o campo.
 *
 * Prisma aceita `FieldUpdateOperationsInput` em `UncheckedUpdateInput`;
 * o codigo do service usa apenas atribuicao literal, mas a normalizacao
 * aqui cobre o caso defensivamente.
 */
function readPatchValue<T>(raw: unknown): { hit: boolean; value: T | null } {
  if (raw === undefined) return { hit: false, value: null };
  if (
    raw !== null &&
    typeof raw === 'object' &&
    !(raw instanceof Date) &&
    'set' in (raw as Record<string, unknown>)
  ) {
    return {
      hit: true,
      value: (raw as { set: T | null }).set ?? null,
    };
  }
  return { hit: true, value: (raw as T | null) ?? null };
}

/**
 * `Date` comparado por `.getTime()` — evita falsos positivos por instancias
 * distintas representando o mesmo instante.
 */
function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

/**
 * Gera a lista de eventos de outbox a partir do diff entre `before` e o `patch`
 * que sera aplicado. Funcao pura — sem I/O, sem DI.
 *
 * Ordem dos eventos segue a ordem de declaracao (estavel) para facilitar
 * asserts em teste.
 */
export function diffWorkItem(
  before: WorkItemDiffRow,
  patch: Prisma.WorkItemUncheckedUpdateInput,
  actorId: string,
  workspaceId: string,
): DiffEvent[] {
  const events: DiffEvent[] = [];

  // --- title -> RENAMED
  {
    const { hit, value } = readPatchValue<string>(patch.title);
    if (hit && value !== null && value !== before.title) {
      events.push({
        eventType: 'RENAMED',
        payload: {
          from: before.title,
          to: value,
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- description | markdownContent -> DESCRIPTION_CHANGED (single event)
  {
    const descPatch = readPatchValue<string>(patch.description);
    const mdPatch = readPatchValue<string>(patch.markdownContent);
    const descChanged =
      descPatch.hit && (descPatch.value ?? null) !== before.description;
    const mdChanged =
      mdPatch.hit && (mdPatch.value ?? null) !== before.markdownContent;
    if (descChanged || mdChanged) {
      events.push({
        eventType: 'DESCRIPTION_CHANGED',
        payload: {
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- statusId -> STATUS_CHANGED
  {
    const { hit, value } = readPatchValue<string>(patch.statusId);
    if (hit && value !== null && value !== before.statusId) {
      events.push({
        eventType: 'STATUS_CHANGED',
        payload: {
          from: before.statusId,
          to: value,
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- priority -> PRIORITY_CHANGED
  {
    const { hit, value } = readPatchValue<TaskPriority>(patch.priority);
    if (hit && value !== null && value !== before.priority) {
      events.push({
        eventType: 'PRIORITY_CHANGED',
        payload: {
          from: before.priority,
          to: value,
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- dueDate -> DUE_DATE_CHANGED
  {
    const { hit, value } = readPatchValue<Date>(patch.dueDate);
    if (hit && !datesEqual(value, before.dueDate)) {
      events.push({
        eventType: 'DUE_DATE_CHANGED',
        payload: {
          from: toIsoOrNull(before.dueDate),
          to: toIsoOrNull(value),
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- startDate -> START_DATE_CHANGED
  {
    const { hit, value } = readPatchValue<Date>(patch.startDate);
    if (hit && !datesEqual(value, before.startDate)) {
      events.push({
        eventType: 'START_DATE_CHANGED',
        payload: {
          from: toIsoOrNull(before.startDate),
          to: toIsoOrNull(value),
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- points -> POINTS_CHANGED
  //   Prisma pode trazer Decimal; comparamos em numero simples (schema define
  //   points como inteiro/decimal pequeno; helper converte via Number()).
  {
    const { hit, value } = readPatchValue<unknown>(patch.points);
    if (hit) {
      const next = value === null || value === undefined ? null : Number(value);
      if (next !== before.points) {
        events.push({
          eventType: 'POINTS_CHANGED',
          payload: {
            from: before.points,
            to: next,
            actorId,
            workspaceId,
          },
        });
      }
    }
  }

  // --- archived -> ARCHIVED | UNARCHIVED
  {
    const { hit, value } = readPatchValue<boolean>(patch.archived);
    if (hit && value !== null && value !== before.archived) {
      events.push({
        eventType: value ? 'ARCHIVED' : 'UNARCHIVED',
        payload: {
          actorId,
          workspaceId,
        },
      });
    }
  }

  // --- customTypeId -> CUSTOM_TYPE_CHANGED
  {
    const { hit, value } = readPatchValue<string>(patch.customTypeId);
    if (hit && (value ?? null) !== before.customTypeId) {
      events.push({
        eventType: 'CUSTOM_TYPE_CHANGED',
        payload: {
          from: before.customTypeId,
          to: value ?? null,
          actorId,
          workspaceId,
        },
      });
    }
  }

  return events;
}
