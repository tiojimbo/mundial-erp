import { Logger, NotFoundException } from '@nestjs/common';
import { CustomFieldType } from '@prisma/client';
import { CustomFieldValuesService } from './custom-field-values.service';

type AnyFn = jest.Mock;

interface MockPrisma {
  workItem: { findFirst: AnyFn };
  workspaceMember: { findFirst: AnyFn; count: AnyFn };
  $transaction: AnyFn;
}
interface MockDefinitionsRepo {
  findVisibleById: AnyFn;
}
interface MockValuesRepo {
  findTaskInWorkspace: AnyFn;
  findValueByPair: AnyFn;
  upsertValue: AnyFn;
  deleteValue: AnyFn;
  findValuesForTask: AnyFn;
}
interface MockMetrics {
  customFieldsWrittenTotal: AnyFn;
}
interface MockPublisher {
  emitCustomFieldChanged: AnyFn;
}

const WS = 'ws-1';
const TASK = 'task-1';
const DEF = 'def-1';
const ACTOR = 'user-actor';
const LIST = 'list-1';
const FOLDER = 'folder-1';
const SPACE = 'space-1';

const defaultDefinition = {
  id: DEF,
  workspaceId: WS,
  type: CustomFieldType.TEXT,
  label: 'Campo',
  key: 'campo',
  required: false,
  config: {},
  options: [],
  deletedAt: null,
};

const persistedRow = {
  id: 'val-1',
  workItemId: TASK,
  definitionId: DEF,
  valueText: 'novo',
  valueNumber: null,
  valueDate: null,
  valueBoolean: null,
  valueJson: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  definition: defaultDefinition,
};

function buildHarness(opts?: {
  previousValue?: string | null;
  noPrevious?: boolean;
}) {
  const txMock = {
    customFieldValue: { findMany: jest.fn(async () => []) },
    taskOutboxEvent: { create: jest.fn(async () => undefined) },
  };

  const prisma: MockPrisma = {
    workItem: {
      findFirst: jest.fn(async () => ({
        listId: LIST,
        list: { folderId: FOLDER, spaceId: SPACE, folder: { spaceId: SPACE } },
      })),
    },
    workspaceMember: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(txMock)),
  };

  const definitionsRepo: MockDefinitionsRepo = {
    findVisibleById: jest.fn(async () => defaultDefinition),
  };

  const valuesRepo: MockValuesRepo = {
    findTaskInWorkspace: jest.fn(async () => ({ id: TASK })),
    findValueByPair: jest.fn(async () => {
      if (opts?.noPrevious) return null;
      return {
        valueText: opts?.previousValue ?? 'antigo',
        valueNumber: null,
        valueDate: null,
        valueBoolean: null,
        valueJson: null,
        definition: defaultDefinition,
      };
    }),
    upsertValue: jest.fn(async () => persistedRow),
    deleteValue: jest.fn(async () => persistedRow),
    findValuesForTask: jest.fn(async () => []),
  };

  const metrics: MockMetrics = { customFieldsWrittenTotal: jest.fn() };
  const publisher: MockPublisher = { emitCustomFieldChanged: jest.fn() };

  Logger.overrideLogger([
    { log: () => undefined, warn: () => undefined, error: () => undefined } as never,
  ]);

  const service = new CustomFieldValuesService(
    prisma as never,
    definitionsRepo as never,
    valuesRepo as never,
    metrics as never,
    publisher as never,
  );

  return { service, prisma, definitionsRepo, valuesRepo, metrics, publisher, txMock };
}

describe('CustomFieldValuesService — emissao de eventos para Automations', () => {
  describe('setValue', () => {
    it('emite emitCustomFieldChanged 1x com before/after corretos', async () => {
      const h = buildHarness({ previousValue: 'antigo' });

      await h.service.setValue(WS, TASK, DEF, 'novo', ACTOR);

      expect(h.publisher.emitCustomFieldChanged).toHaveBeenCalledTimes(1);
      const arg = h.publisher.emitCustomFieldChanged.mock
        .calls[0][0] as Record<string, unknown>;
      expect(arg).toMatchObject({
        workspaceId: WS,
        taskId: TASK,
        listId: LIST,
        folderId: FOLDER,
        spaceId: SPACE,
        actorUserId: ACTOR,
        customFieldDefinitionId: DEF,
        before: 'antigo',
        after: 'novo',
      });
    });

    it('quando nao existia valor anterior, before=null e after preenchido', async () => {
      const h = buildHarness({ noPrevious: true });

      await h.service.setValue(WS, TASK, DEF, 'novo', ACTOR);

      expect(h.publisher.emitCustomFieldChanged).toHaveBeenCalledTimes(1);
      const arg = h.publisher.emitCustomFieldChanged.mock
        .calls[0][0] as Record<string, unknown>;
      expect(arg.before).toBeNull();
      expect(arg.after).toBe('novo');
    });
  });

  describe('clearValue', () => {
    it('emite emitCustomFieldChanged 1x com after=null', async () => {
      const h = buildHarness({ previousValue: 'antigo' });

      await h.service.clearValue(WS, TASK, DEF);

      expect(h.publisher.emitCustomFieldChanged).toHaveBeenCalledTimes(1);
      const arg = h.publisher.emitCustomFieldChanged.mock
        .calls[0][0] as Record<string, unknown>;
      expect(arg).toMatchObject({
        workspaceId: WS,
        taskId: TASK,
        listId: LIST,
        folderId: FOLDER,
        spaceId: SPACE,
        actorUserId: null,
        customFieldDefinitionId: DEF,
        before: 'antigo',
        after: null,
      });
    });

    it('clearValue em campo sem valor existente lanca 404 e nao emite', async () => {
      const h = buildHarness();
      h.valuesRepo.deleteValue.mockResolvedValueOnce(null);

      await expect(h.service.clearValue(WS, TASK, DEF)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(h.publisher.emitCustomFieldChanged).not.toHaveBeenCalled();
    });
  });
});
