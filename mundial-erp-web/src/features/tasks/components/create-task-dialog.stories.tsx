/**
 * Storybook stories — CreateTaskDialog (PLANO-TASKS §7.2 + §10).
 *
 * Variantes cobrindo as 3 telas (Department/Area/Process) + erros.
 * Usa MSW para mockar `POST /api/v1/processes/:id/tasks`.
 *
 * Observacoes:
 *   - `CreateTaskDialog` ainda em desenvolvimento (Renato, story FE-TSK-S1-11).
 *     Este arquivo assume a superficie definida no plano:
 *       props: { open, onOpenChange, lockedProcessId?, areaId?, departmentId?, onCreated? }
 *     Se a API do componente mudar, atualizar imports/args.
 *   - MSW handlers usam `http.post` (msw v2). Migrar para `rest.post` se o
 *     projeto fixar MSW v1.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { http, HttpResponse, delay } from 'msw';
import { CreateTaskDialog } from './create-task-dialog';

interface FakeProcess {
  id: string;
  name: string;
  areaId: string;
}

interface FakeArea {
  id: string;
  name: string;
  processes: FakeProcess[];
}

const AREAS_OF_DEPT: FakeArea[] = [
  {
    id: 'area-1',
    name: 'Area Comercial',
    processes: [
      { id: 'process-1', name: 'Leads', areaId: 'area-1' },
      { id: 'process-2', name: 'Propostas', areaId: 'area-1' },
      { id: 'process-3', name: 'Follow-up', areaId: 'area-1' },
    ],
  },
  {
    id: 'area-2',
    name: 'Area Logistica',
    processes: [
      { id: 'process-4', name: 'Expedicao', areaId: 'area-2' },
      { id: 'process-5', name: 'Coletas', areaId: 'area-2' },
    ],
  },
];

const AREA_1_PROCESSES: FakeProcess[] = AREAS_OF_DEPT[0].processes;

const createSuccessHandler = http.post(
  '/api/v1/processes/:processId/tasks',
  async ({ params }) => {
    await delay(300);
    return HttpResponse.json({
      data: {
        id: 'task-fake-1',
        processId: params.processId,
        title: 'Task criada',
        statusId: 'status-not-started',
        status: {
          id: 'status-not-started',
          name: 'To Do',
          category: 'NOT_STARTED',
          color: '#94a3b8',
          icon: null,
        },
        itemType: 'TASK',
        priority: 'NONE',
        primaryAssigneeId: null,
        primaryAssigneeName: null,
        assignees: [],
        tags: [],
        creatorId: 'user-1',
        creatorName: 'Owner',
        parentId: null,
        mergedIntoId: null,
        description: null,
        markdownContent: null,
        customTypeId: null,
        customType: null,
        startDate: null,
        dueDate: null,
        completedAt: null,
        closedAt: null,
        archived: false,
        estimatedMinutes: null,
        trackedMinutes: 0,
        timeSpentSeconds: 0,
        points: null,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      meta: { taskId: 'task-fake-1', processId: params.processId },
    });
  },
);

const createErrorHandler = http.post(
  '/api/v1/processes/:processId/tasks',
  async () => {
    await delay(300);
    return HttpResponse.json(
      { statusCode: 500, message: 'Erro interno' },
      { status: 500 },
    );
  },
);

const departmentSummariesHandler = http.get(
  '/api/v1/departments/:id/summary',
  () =>
    HttpResponse.json({
      data: { id: 'dept-1', name: 'Comercial', areas: AREAS_OF_DEPT },
      meta: {},
    }),
);

const areaSummariesHandler = http.get('/api/v1/areas/:id/summary', () =>
  HttpResponse.json({
    data: { id: 'area-1', name: 'Area Comercial', processes: AREA_1_PROCESSES },
    meta: {},
  }),
);

const meta: Meta<typeof CreateTaskDialog> = {
  title: 'Features/Tasks/CreateTaskDialog',
  component: CreateTaskDialog,
  parameters: {
    layout: 'fullscreen',
    msw: {
      handlers: [
        createSuccessHandler,
        departmentSummariesHandler,
        areaSummariesHandler,
      ],
    },
  },
  args: {
    open: true,
    onOpenChange: () => undefined,
    onCreated: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof CreateTaskDialog>;

/**
 * Variante: aberto a partir da pagina de Process.
 * processId pre-selecionado e travado (campo invisivel no form).
 */
export const LockedProcess: Story = {
  args: {
    lockedProcessId: 'process-1',
  },
};

/**
 * Variante: aberto a partir da pagina de Area.
 * Combobox Process renderizado com lista carregada via useAreaSummaries.
 */
export const FromArea: Story = {
  args: {
    areaId: 'area-1',
  },
  parameters: {
    msw: {
      handlers: [createSuccessHandler, areaSummariesHandler],
    },
  },
};

/**
 * Variante: aberto a partir da pagina de Department.
 * Cascata Area -> Process (2 areas, 5 processes no total).
 */
export const FromDepartment: Story = {
  args: {
    departmentId: 'dept-1',
  },
  parameters: {
    msw: {
      handlers: [createSuccessHandler, departmentSummariesHandler],
    },
  },
};

/**
 * Variante: erro de submit. Handler retorna 500; UI deve exibir toast.error
 * e manter o dialog aberto para o usuario tentar novamente.
 */
export const SubmitError: Story = {
  args: {
    lockedProcessId: 'process-1',
  },
  parameters: {
    msw: {
      handlers: [createErrorHandler],
    },
  },
};

/**
 * Variante: erro de validacao client-side.
 * Reproduz o estado de submit com title vazio (<3 chars) — botao desabilitado
 * e mensagem zod visivel.
 */
export const ValidationError: Story = {
  args: {
    lockedProcessId: 'process-1',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Simula submit com title vazio. Esperado: botao Criar disabled + mensagem zod "Minimo 3 caracteres" sob o campo.',
      },
    },
  },
};
