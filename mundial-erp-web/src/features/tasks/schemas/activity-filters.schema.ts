import { z } from 'zod';

/**
 * Sprint 5 (TSK-160) — Filtros do painel de atividades.
 *
 * Espelha o enum `TaskActivityType` de `prisma/schema.prisma` (28 literais
 * aditivos mais `DEPENDENCY_UNBLOCKED` emitido via outbox pos-sucessor).
 * Todo input do popover de filtros e validado contra este schema antes
 * de persistir no Zustand.
 */

export const TASK_ACTIVITY_TYPES = [
  'CREATED',
  'RENAMED',
  'DESCRIPTION_CHANGED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'DUE_DATE_CHANGED',
  'START_DATE_CHANGED',
  'ASSIGNEE_ADDED',
  'ASSIGNEE_REMOVED',
  'WATCHER_ADDED',
  'WATCHER_REMOVED',
  'TAG_ADDED',
  'TAG_REMOVED',
  'CUSTOM_TYPE_CHANGED',
  'POINTS_CHANGED',
  'ARCHIVED',
  'UNARCHIVED',
  'MERGED_INTO',
  'DEPENDENCY_ADDED',
  'DEPENDENCY_REMOVED',
  'DEPENDENCY_UNBLOCKED',
  'LINK_ADDED',
  'LINK_REMOVED',
  'CHECKLIST_CREATED',
  'CHECKLIST_ITEM_RESOLVED',
  'ATTACHMENT_ADDED',
  'SUBTASK_ADDED',
  'SUBTASK_COMPLETED',
  'COMMENT_ADDED',
] as const;

export type TaskActivityTypeLiteral = (typeof TASK_ACTIVITY_TYPES)[number];

export const activityFilterGroupSchema = z.enum([
  'ALL',
  'ACTIVITY',
  'COMMENT',
]);

export type ActivityFilterGroup = z.infer<typeof activityFilterGroupSchema>;

export const activityFiltersSchema = z.object({
  type: activityFilterGroupSchema.default('ALL'),
  actions: z.array(z.enum(TASK_ACTIVITY_TYPES)).default([]),
  actorIds: z.array(z.string().uuid()).default([]),
});

export type ActivityFilters = z.infer<typeof activityFiltersSchema>;

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  type: 'ALL',
  actions: [],
  actorIds: [],
};

/** Rotulos PT-BR para cada action (usado no popover de filtros). */
export const ACTION_LABELS_PT: Record<TaskActivityTypeLiteral, string> = {
  CREATED: 'Criou tarefa',
  RENAMED: 'Renomeou',
  DESCRIPTION_CHANGED: 'Editou descricao',
  STATUS_CHANGED: 'Mudou status',
  PRIORITY_CHANGED: 'Alterou prioridade',
  DUE_DATE_CHANGED: 'Data de entrega',
  START_DATE_CHANGED: 'Data de inicio',
  ASSIGNEE_ADDED: 'Adicionou responsavel',
  ASSIGNEE_REMOVED: 'Removeu responsavel',
  WATCHER_ADDED: 'Adicionou observador',
  WATCHER_REMOVED: 'Removeu observador',
  TAG_ADDED: 'Adicionou tag',
  TAG_REMOVED: 'Removeu tag',
  CUSTOM_TYPE_CHANGED: 'Mudou tipo',
  POINTS_CHANGED: 'Alterou pontos',
  ARCHIVED: 'Arquivou',
  UNARCHIVED: 'Reativou',
  MERGED_INTO: 'Mergeou',
  DEPENDENCY_ADDED: 'Adicionou dependencia',
  DEPENDENCY_REMOVED: 'Removeu dependencia',
  DEPENDENCY_UNBLOCKED: 'Desbloqueou dependencia',
  LINK_ADDED: 'Vinculou tarefa',
  LINK_REMOVED: 'Desvinculou tarefa',
  CHECKLIST_CREATED: 'Criou checklist',
  CHECKLIST_ITEM_RESOLVED: 'Concluiu item',
  ATTACHMENT_ADDED: 'Anexou arquivo',
  SUBTASK_ADDED: 'Adicionou subtarefa',
  SUBTASK_COMPLETED: 'Concluiu subtarefa',
  COMMENT_ADDED: 'Comentou',
};
