import { AutomationTrigger } from '@prisma/client';
import { TriggerDef } from './types';

export const TRIGGERS_CATALOG: ReadonlyArray<TriggerDef> = [
  {
    id: AutomationTrigger.TASK_CREATED,
    label: 'Tarefa criada',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_UPDATED,
    label: 'Tarefa atualizada',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_STATUS_CHANGED,
    label: 'Status alterado',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_PRIORITY_CHANGED,
    label: 'Prioridade alterada',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_NAME_CHANGED,
    label: 'Nome alterado',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_TYPE_CHANGED,
    label: 'Tipo alterado',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_DUE_DATE_CHANGED,
    label: 'Data de entrega alterada',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_START_DATE_CHANGED,
    label: 'Data de início alterada',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_MOVED_TO_LIST,
    label: 'Tarefa movida para outra lista',
    category: 'task',
  },
  {
    id: AutomationTrigger.TASK_ASSIGNED,
    label: 'Responsável atribuído',
    category: 'assignment',
  },
  {
    id: AutomationTrigger.ASSIGNEE_REMOVED,
    label: 'Responsável removido',
    category: 'assignment',
  },
  { id: AutomationTrigger.TAG_ADDED, label: 'Tag adicionada', category: 'tag' },
  { id: AutomationTrigger.TAG_REMOVED, label: 'Tag removida', category: 'tag' },
  {
    id: AutomationTrigger.COMMENT_CREATED,
    label: 'Comentário criado',
    category: 'comment',
  },
  {
    id: AutomationTrigger.SUBTASK_CREATED,
    label: 'Subtarefa criada',
    category: 'subtask',
  },
  {
    id: AutomationTrigger.ALL_SUBTASKS_RESOLVED,
    label: 'Todas as subtarefas resolvidas',
    category: 'subtask',
  },
  {
    id: AutomationTrigger.CUSTOMFIELD_CHANGED,
    label: 'Campo personalizado alterado',
    category: 'custom-field',
  },
  {
    id: AutomationTrigger.CRON,
    label: 'Agendamento (cron)',
    category: 'schedule',
  },
];
