import { z } from 'zod';

/**
 * Sprint 1 (TSK-110+) — Zod schemas espelhando o contrato
 * de `/api/v1/tasks` descrito no PLANO-TASKS.md §7.
 *
 * Todos os tipos em `../types/task.types.ts` sao derivados via `z.infer`
 * para garantir uma unica fonte da verdade.
 */

export const taskPrioritySchema = z.enum([
  'URGENT',
  'HIGH',
  'NORMAL',
  'LOW',
  'NONE',
]);

export const taskOrderBySchema = z.enum([
  'id',
  'createdAt',
  'updatedAt',
  'dueDate',
  'priority',
  'sortOrder',
  'points',
]);

export const taskDirectionSchema = z.enum(['asc', 'desc']);

export const taskItemTypeSchema = z.enum(['TASK', 'MILESTONE']);

export const taskIncludeSchema = z.enum([
  'subtasks',
  'checklists',
  'dependencies',
  'links',
  'tags',
  'watchers',
  'attachments',
  'markdown',
]);

/**
 * Filtros de listagem `GET /api/v1/tasks`.
 * Baseado literalmente no PLANO-TASKS.md §7.1.
 * NAO expor `include=*`; campos sumarizados via Prisma `select` (CTO note #4).
 */
export const taskFiltersSchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.string().optional(),
    processIds: z.array(z.string().uuid()).optional(),
    areaIds: z.array(z.string().uuid()).optional(),
    departmentIds: z.array(z.string().uuid()).optional(),
    statuses: z.array(z.string().uuid()).optional(),
    assigneeIds: z.array(z.string().uuid()).optional(),
    tagIds: z.array(z.string().uuid()).optional(),
    customTypeIds: z.array(z.string().uuid()).optional(),
    priority: z.array(taskPrioritySchema).optional(),
    archived: z.boolean().optional(),
    search: z.string().trim().min(1).optional(),
    dueDateGt: z.string().datetime().optional(),
    dueDateLt: z.string().datetime().optional(),
    createdGt: z.string().datetime().optional(),
    createdLt: z.string().datetime().optional(),
    updatedGt: z.string().datetime().optional(),
    updatedLt: z.string().datetime().optional(),
    parentId: z.string().uuid().nullable().optional(),
    orderBy: taskOrderBySchema.optional(),
    direction: taskDirectionSchema.optional(),
    includeClosed: z.boolean().optional(),
  })
  .strict();

/**
 * `WorkflowStatus` exposto como parte do `Task` de listagem.
 * Campos minimos conforme select obrigatorio.
 */
export const taskStatusSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.enum(['NOT_STARTED', 'ACTIVE', 'DONE', 'CLOSED']),
  color: z.string(),
  icon: z.string().nullable(),
});

export const taskAssigneeSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string().nullable(),
  isPrimary: z.boolean(),
});

export const taskTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
});

/**
 * `CustomTaskType` — vide PLANO-TASKS.md §7.3 e §8.10.
 * `workspaceId = null` indica builtin (compartilhado por todos os workspaces).
 */
export const customTaskTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  workspaceId: z.string().uuid().nullable(),
  isBuiltin: z.boolean(),
});

/**
 * Entidade Task sumarizada (retornada em listagens).
 * Mesmo registro do `WorkItem` no Prisma (vide README.md).
 */
export const taskSummarySchema = z.object({
  id: z.string().uuid(),
  processId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  markdownContent: z.string().nullable(),
  status: taskStatusSchema,
  statusId: z.string().uuid(),
  itemType: taskItemTypeSchema,
  priority: taskPrioritySchema,
  customTypeId: z.string().uuid().nullable(),
  customType: customTaskTypeSchema.nullable(),
  primaryAssigneeId: z.string().uuid().nullable(),
  primaryAssigneeName: z.string().nullable(),
  assignees: z.array(taskAssigneeSchema),
  tags: z.array(taskTagSchema),
  creatorId: z.string().uuid(),
  creatorName: z.string().nullable(),
  parentId: z.string().uuid().nullable(),
  mergedIntoId: z.string().uuid().nullable(),
  startDate: z.string().datetime().nullable(),
  dueDate: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  archived: z.boolean(),
  estimatedMinutes: z.number().int().nullable(),
  trackedMinutes: z.number().int(),
  timeSpentSeconds: z.number().int(),
  points: z.number().min(0).max(999.99).nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Checklist items — hierarquia rasa (depth <= 3 service-level §8.9).
 */
export const taskChecklistItemSchema: z.ZodType<{
  id: string;
  checklistId: string;
  text: string;
  completed: boolean;
  position: number;
  parentId: string | null;
  completedAt: string | null;
  completedById: string | null;
  children?: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    checklistId: z.string().uuid(),
    text: z.string(),
    completed: z.boolean(),
    position: z.number().int(),
    parentId: z.string().uuid().nullable(),
    completedAt: z.string().datetime().nullable(),
    completedById: z.string().uuid().nullable(),
    children: z.array(taskChecklistItemSchema).optional(),
  }),
);

export const taskChecklistSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string(),
  position: z.number().int(),
  items: z.array(taskChecklistItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const taskDependencySchema = z.object({
  id: z.string().uuid(),
  fromTaskId: z.string().uuid(),
  toTaskId: z.string().uuid(),
  type: z.enum(['BLOCKS', 'WAITING_ON']).optional(),
  createdAt: z.string().datetime(),
});

export const taskDependenciesBundleSchema = z.object({
  blocking: z.array(taskDependencySchema),
  waitingOn: z.array(taskDependencySchema),
});

export const taskLinkSchema = z.object({
  id: z.string().uuid(),
  fromTaskId: z.string().uuid(),
  toTaskId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const taskWatcherSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string().nullable(),
  addedAt: z.string().datetime(),
});

export const taskAttachmentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  storageKey: z.string(),
  downloadUrl: z.string().url().nullable(),
  scanStatus: z.enum(['PENDING', 'CLEAN', 'INFECTED', 'ERROR']),
  uploadedById: z.string().uuid(),
  uploadedByName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const taskCommentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string().nullable(),
  body: z.string(),
  bodyBlocks: z.unknown().nullable(),
  editedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const taskActivitySchema = z.object({
  id: z.string(),
  workItemId: z.string().optional(),
  taskId: z.string().optional(),
  type: z.string(),
  actorId: z.string().nullable(),
  actor: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  actorName: z.string().nullable().optional(),
  payload: z.unknown().nullable(),
  createdAt: z.string(),
});

export const taskTemplateSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  payload: z.unknown(),
  createdById: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const taskTimeInStatusSchema = z.object({
  taskId: z.string().uuid(),
  byStatusId: z.record(
    z.string().uuid(),
    z.object({
      statusId: z.string().uuid(),
      statusName: z.string(),
      totalSeconds: z.number().int().nonnegative(),
      entries: z.number().int().nonnegative(),
    }),
  ),
  totalSeconds: z.number().int().nonnegative(),
});

/**
 * Detail — TaskSummary + includes opcionais (via `include=`).
 */
export const taskDetailSchema = taskSummarySchema.extend({
  subtasks: z.array(taskSummarySchema).optional(),
  checklists: z.array(taskChecklistSchema).optional(),
  dependencies: taskDependenciesBundleSchema.optional(),
  links: z.array(taskLinkSchema).optional(),
  watchers: z.array(taskWatcherSchema).optional(),
  attachments: z.array(taskAttachmentSchema).optional(),
});

/**
 * Payloads / DTOs.
 */
export const createTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  markdownContent: z.string().optional(),
  // `statusId` opcional no novo endpoint `/processes/:processId/tasks`:
  // quando omitido o backend resolve com o primeiro status NOT_STARTED
  // do workflow do processo.
  statusId: z.string().uuid().optional(),
  itemType: taskItemTypeSchema.optional(),
  priority: taskPrioritySchema.optional(),
  customTypeId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  points: z.number().min(0).max(999.99).optional(),
  templateId: z.string().uuid().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    markdownContent: z.string().nullable().optional(),
    statusId: z.string().uuid().optional(),
    priority: taskPrioritySchema.optional(),
    customTypeId: z.string().uuid().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    processId: z.string().uuid().optional(),
    startDate: z.string().datetime().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    estimatedMinutes: z.number().int().nonnegative().nullable().optional(),
    points: z.number().min(0).max(999.99).nullable().optional(),
    archived: z.boolean().optional(),
    assignees: z
      .object({
        add: z.array(z.string().uuid()).optional(),
        rem: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    watchers: z
      .object({
        add: z.array(z.string().uuid()).optional(),
        rem: z.array(z.string().uuid()).optional(),
      })
      .optional(),
    tagIds: z
      .object({
        add: z.array(z.string().uuid()).optional(),
        rem: z.array(z.string().uuid()).optional(),
      })
      .optional(),
  })
  .strict();

export const mergeTasksSchema = z.object({
  sourceTaskIds: z.array(z.string().uuid()).min(1).max(50),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1),
});

export const updateTagSchema = createTagSchema.partial();

export const createChecklistSchema = z.object({
  title: z.string().trim().min(1),
});

export const updateChecklistSchema = z.object({
  title: z.string().trim().min(1).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const createChecklistItemSchema = z.object({
  text: z.string().trim().min(1),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const updateChecklistItemSchema = z.object({
  text: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const reorderChecklistSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().nonnegative(),
  }),
);

export const createDependencySchema = z
  .object({
    dependsOn: z.string().uuid().optional(),
    dependencyOf: z.string().uuid().optional(),
  })
  .refine(
    (v) => Boolean(v.dependsOn) !== Boolean(v.dependencyOf),
    { message: 'Informe exatamente um: dependsOn OU dependencyOf.' },
  );

export const attachmentSignedUrlRequestSchema = z.object({
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
});

export const attachmentSignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  storageKey: z.string(),
  expiresAt: z.string().datetime(),
});

export const attachmentUploadSchema = z.object({
  storageKey: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1),
  bodyBlocks: z.unknown().optional(),
});

export const commentUpdateSchema = z.object({
  body: z.string().trim().min(1).optional(),
  bodyBlocks: z.unknown().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1),
  payload: z.unknown(),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  payload: z.unknown().optional(),
});

/**
 * Paginacao devolvida pelo backend (§7 envelope).
 */
export const taskPaginationSchema = z.object({
  page: z.number().int().nonnegative().optional(),
  limit: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional(),
  cursor: z
    .object({
      next: z.string().nullable(),
      hasMore: z.boolean(),
    })
    .optional(),
});

/**
 * Compat Sprint 0 — mantem exports antigos para componentes ja migrados.
 */
export const taskSchema = taskSummarySchema;
export const createTaskPayloadSchema = createTaskSchema.extend({
  processId: z.string().uuid(),
});
export const updateTaskPayloadSchema = updateTaskSchema;

/**
 * Schema leve usado pelo `CreateTaskDialog` (UI).
 * Subconjunto dos campos aceitos pelo endpoint
 * `POST /api/v1/processes/:processId/tasks` (DTO do Felipe).
 *
 * Nao inclui `statusId`: o backend resolve automaticamente o primeiro
 * status `NOT_STARTED` do workflow quando omitido.
 */
export const createTaskFormSchema = z.object({
  processId: z.string().min(1, 'Selecione um processo'),
  title: z
    .string()
    .trim()
    .min(3, 'Minimo 3 caracteres')
    .max(255, 'Maximo 255 caracteres'),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().optional(),
});

export type CreateTaskFormData = z.infer<typeof createTaskFormSchema>;
