import { ActionDef } from './types';

export const ACTION_IDS = [
  'change_status',
  'move_to_list',
  'change_priority',
  'change_assignees',
  'change_task_name',
  'change_task_type',
  'change_tags',
  'set_custom_field',
  'set_time_estimate',
  'add_task_link',
  'change_due_date',
  'change_start_date',
  'add_comment',
  'send_notification',
  'create_subtask',
  'delete_task',
  'duplicate_task',
  'create_list',
  'call_webhook',
  'send_channel_message',
  'send_direct_message',
] as const;

export type ActionId = (typeof ACTION_IDS)[number];

export const ACTIONS_CATALOG: ReadonlyArray<ActionDef> = [
  {
    id: 'change_status',
    label: 'Alterar status',
    category: 'task',
    params: [
      {
        name: 'statusId',
        type: 'reference',
        referenceType: 'status',
        required: true,
      },
    ],
  },
  {
    id: 'move_to_list',
    label: 'Mover para lista',
    category: 'navigation',
    params: [
      {
        name: 'listId',
        type: 'reference',
        referenceType: 'list',
        required: true,
      },
    ],
  },
  {
    id: 'change_priority',
    label: 'Alterar prioridade',
    category: 'task',
    params: [
      {
        name: 'priority',
        type: 'enum',
        enumValues: ['NONE', 'LOW', 'NORMAL', 'HIGH', 'URGENT'],
        required: true,
      },
    ],
  },
  {
    id: 'change_assignees',
    label: 'Alterar responsáveis',
    category: 'assignment',
    params: [
      {
        name: 'mode',
        type: 'enum',
        enumValues: ['set', 'add', 'remove'],
        required: true,
      },
      {
        name: 'userIds',
        type: 'reference',
        referenceType: 'user',
        required: true,
        description: 'Array de IDs de usuários',
      },
    ],
  },
  {
    id: 'change_task_name',
    label: 'Renomear tarefa',
    category: 'task',
    params: [{ name: 'name', type: 'string', required: true }],
  },
  {
    id: 'change_task_type',
    label: 'Alterar tipo de tarefa',
    category: 'task',
    params: [
      {
        name: 'customTaskTypeId',
        type: 'reference',
        referenceType: 'task-type',
        required: true,
      },
    ],
  },
  {
    id: 'change_tags',
    label: 'Alterar tags',
    category: 'tag',
    params: [
      {
        name: 'mode',
        type: 'enum',
        enumValues: ['set', 'add', 'remove'],
        required: true,
      },
      {
        name: 'tagIds',
        type: 'reference',
        referenceType: 'tag',
        required: true,
        description: 'Array de IDs de tags',
      },
    ],
  },
  {
    id: 'set_custom_field',
    label: 'Definir campo personalizado',
    category: 'custom-field',
    params: [
      {
        name: 'customFieldDefinitionId',
        type: 'reference',
        referenceType: 'custom-field',
        required: true,
      },
      { name: 'value', type: 'json', required: true },
    ],
  },
  {
    id: 'set_time_estimate',
    label: 'Definir estimativa de tempo',
    category: 'task',
    params: [
      {
        name: 'estimateMinutes',
        type: 'number',
        required: true,
        description: 'Estimativa em minutos',
      },
    ],
  },
  {
    id: 'add_task_link',
    label: 'Adicionar link entre tarefas',
    category: 'task',
    params: [
      {
        name: 'targetTaskId',
        type: 'string',
        required: true,
        description: 'ID da tarefa de destino (workspace-scoped)',
      },
      {
        name: 'linkType',
        type: 'enum',
        enumValues: ['RELATES_TO', 'DUPLICATES', 'IS_DUPLICATED_BY'],
        required: true,
      },
    ],
  },
  {
    id: 'change_due_date',
    label: 'Alterar data de entrega',
    category: 'task',
    params: [
      {
        name: 'dueDate',
        type: 'date',
        required: true,
        description: 'ISO-8601 ou expressão relativa (e.g. +3d)',
      },
    ],
  },
  {
    id: 'change_start_date',
    label: 'Alterar data de início',
    category: 'task',
    params: [
      {
        name: 'startDate',
        type: 'date',
        required: true,
        description: 'ISO-8601 ou expressão relativa (e.g. +0d)',
      },
    ],
  },
  {
    id: 'add_comment',
    label: 'Adicionar comentário',
    category: 'comment',
    params: [
      { name: 'content', type: 'string', required: true },
      {
        name: 'mentions',
        type: 'reference',
        referenceType: 'user',
        required: false,
        description: 'Array de IDs de usuários mencionados',
      },
    ],
  },
  {
    id: 'send_notification',
    label: 'Enviar notificação',
    category: 'integration',
    params: [
      {
        name: 'userIds',
        type: 'reference',
        referenceType: 'user',
        required: true,
        description: 'Array de IDs de destinatários',
      },
      { name: 'message', type: 'string', required: true },
    ],
  },
  {
    id: 'create_subtask',
    label: 'Criar subtarefa',
    category: 'task',
    params: [
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      {
        name: 'assigneeIds',
        type: 'reference',
        referenceType: 'user',
        required: false,
      },
    ],
  },
  {
    id: 'delete_task',
    label: 'Deletar tarefa',
    category: 'task',
    params: [],
  },
  {
    id: 'duplicate_task',
    label: 'Duplicar tarefa',
    category: 'task',
    params: [
      {
        name: 'targetListId',
        type: 'reference',
        referenceType: 'list',
        required: false,
        description: 'Se omitido, duplica na mesma lista',
      },
    ],
  },
  {
    id: 'create_list',
    label: 'Criar lista',
    category: 'navigation',
    params: [
      { name: 'name', type: 'string', required: true },
      {
        name: 'folderId',
        type: 'reference',
        referenceType: 'list',
        required: true,
        description: 'Folder pai',
      },
    ],
  },
  {
    id: 'call_webhook',
    label: 'Chamar webhook HTTP',
    category: 'integration',
    params: [
      { name: 'url', type: 'string', required: true },
      {
        name: 'method',
        type: 'enum',
        enumValues: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        required: true,
      },
      {
        name: 'headers',
        type: 'json',
        required: false,
        description: 'Map<string,string>',
      },
      { name: 'body', type: 'json', required: false },
    ],
  },
  {
    id: 'send_channel_message',
    label: 'Enviar mensagem em canal',
    category: 'integration',
    notImplemented: true,
    params: [
      {
        name: 'channelId',
        type: 'reference',
        referenceType: 'channel',
        required: true,
      },
      { name: 'content', type: 'string', required: true },
    ],
  },
  {
    id: 'send_direct_message',
    label: 'Enviar mensagem direta',
    category: 'integration',
    notImplemented: true,
    params: [
      {
        name: 'userId',
        type: 'reference',
        referenceType: 'user',
        required: true,
      },
      { name: 'content', type: 'string', required: true },
    ],
  },
];
