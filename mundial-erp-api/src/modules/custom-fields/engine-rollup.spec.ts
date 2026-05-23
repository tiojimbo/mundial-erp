import { Logger } from '@nestjs/common';
import { CustomFieldType } from '@prisma/client';
import { CustomFieldValuesService } from './custom-field-values.service';

const WS = 'ws-1';
const PRODUCT_TASK = 'task-product-1';
const INSUMO_A = 'task-insumo-a';
const INSUMO_B = 'task-insumo-b';
const ACTOR = 'user-actor';

const REL_DEF_ID = 'cfd-product-insumos';
const ROLLUP_DEF_ID = 'cfd-product-price-cost';
const CASH_DEF_ID = 'cfd-product-price-cash';
const TERM_DEF_ID = 'cfd-product-price-term';
const COST_DEF_ID = 'cfd-insumo-price-cost';

const relationshipDef = {
  id: REL_DEF_ID,
  workspaceId: null,
  type: CustomFieldType.RELATIONSHIP,
  label: 'Insumos',
  key: 'product_insumos',
  required: false,
  config: { taskTypeIds: ['builtin-bobina'], withQuantity: true },
  options: [],
  deletedAt: null,
};

const costDef = {
  id: COST_DEF_ID,
  workspaceId: null,
  type: CustomFieldType.CURRENCY,
  label: 'Preço de Custo',
  key: 'insumo_price_cost',
  required: false,
  config: null,
  options: [],
  deletedAt: null,
};

const rollupDefEntity = {
  id: ROLLUP_DEF_ID,
  workspaceId: null,
  type: CustomFieldType.ROLLUP,
  label: 'Preço de Custo',
  key: 'product_price_cost',
  required: false,
  config: {
    sourceRelationshipFieldId: REL_DEF_ID,
    sourceCostFieldId: COST_DEF_ID,
    operation: 'sumProduct',
  },
  options: [],
  deletedAt: null,
};

const cashDefEntity = {
  id: CASH_DEF_ID,
  type: CustomFieldType.CURRENCY,
  config: {
    derivedFrom: ROLLUP_DEF_ID,
    operation: 'multiply',
    factor: 1.5,
  },
};

const termDefEntity = {
  id: TERM_DEF_ID,
  type: CustomFieldType.CURRENCY,
  config: {
    derivedFrom: CASH_DEF_ID,
    operation: 'divide',
    factor: 0.85,
  },
};

interface HarnessOpts {
  triggerDefinition:
    | typeof relationshipDef
    | typeof costDef;
  insumoCosts?: Map<string, number>;
  relationshipItems?: { taskId: string; quantity: number }[];
  previousRollup?: number | null;
  productsLinkingInsumo?: string[];
}

function buildHarness(opts: HarnessOpts) {
  const upserts: { definitionId: string; taskId: string; value: number | null }[] = [];
  const txMock = {
    customFieldValue: {
      findMany: jest.fn(
        async (args: {
          where: Record<string, unknown>;
          select?: Record<string, unknown>;
        }) => {
          const where = args.where as {
            definitionId?: string;
            workItemId?: { in: string[] };
            valueJson?: { path: string[]; array_contains: string };
          };
          if (
            where.definitionId === COST_DEF_ID &&
            where.workItemId?.in &&
            opts.insumoCosts
          ) {
            return where.workItemId.in.map((taskId) => ({
              workItemId: taskId,
              valueNumber: opts.insumoCosts!.get(taskId) ?? null,
            }));
          }
          if (
            where.definitionId === REL_DEF_ID &&
            where.valueJson &&
            opts.productsLinkingInsumo
          ) {
            return opts.productsLinkingInsumo.map((taskId) => ({
              workItemId: taskId,
            }));
          }
          return [];
        },
      ),
      findUnique: jest.fn(
        async (args: {
          where: {
            workItemId_definitionId: { workItemId: string; definitionId: string };
          };
        }) => {
          const { workItemId, definitionId } = args.where.workItemId_definitionId;
          if (
            definitionId === REL_DEF_ID &&
            workItemId === PRODUCT_TASK &&
            opts.relationshipItems
          ) {
            return {
              valueJson: {
                items: opts.relationshipItems,
                taskIds: opts.relationshipItems.map((i) => i.taskId),
              },
            };
          }
          if (definitionId === ROLLUP_DEF_ID) {
            return { valueNumber: opts.previousRollup ?? null };
          }
          return null;
        },
      ),
      upsert: jest.fn(
        async (args: {
          where: {
            workItemId_definitionId: { workItemId: string; definitionId: string };
          };
          update?: { valueNumber?: number | null };
          create: { valueNumber?: number | null };
        }) => {
          const { workItemId, definitionId } =
            args.where.workItemId_definitionId;
          const value = args.update?.valueNumber ?? args.create.valueNumber ?? null;
          upserts.push({ taskId: workItemId, definitionId, value });
          return undefined;
        },
      ),
    },
    customFieldDefinition: {
      findFirst: jest.fn(
        async (args: { where: { id: string } }) => {
          if (args.where.id === ROLLUP_DEF_ID) return rollupDefEntity;
          return null;
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { type?: CustomFieldType };
        }) => {
          if (args.where.type === CustomFieldType.ROLLUP) {
            return [rollupDefEntity];
          }
          if (args.where.type === CustomFieldType.CURRENCY) {
            return [cashDefEntity, termDefEntity];
          }
          return [];
        },
      ),
    },
    taskOutboxEvent: { create: jest.fn(async () => undefined) },
  };

  const prisma = {
    workItem: {
      findFirst: jest.fn(async () => ({
        listId: 'list-1',
        list: { folderId: 'folder-1', spaceId: 'space-1', folder: { spaceId: 'space-1' } },
      })),
      count: jest.fn(async () => opts.relationshipItems?.length ?? 0),
    },
    workspaceMember: {
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(txMock)),
  };

  const definitionsRepo = {
    findVisibleById: jest.fn(async () => opts.triggerDefinition),
  };

  const valuesRepo = {
    findTaskInWorkspace: jest.fn(async () => ({ id: PRODUCT_TASK })),
    findValueByPair: jest.fn(async () => null),
    upsertValue: jest.fn(async () => ({
      id: 'val-1',
      workItemId: PRODUCT_TASK,
      definitionId: opts.triggerDefinition.id,
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueBoolean: null,
      valueJson: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      definition: opts.triggerDefinition,
    })),
    deleteValue: jest.fn(),
    findValuesForTask: jest.fn(async () => []),
  };

  Logger.overrideLogger([
    { log: () => undefined, warn: () => undefined, error: () => undefined } as never,
  ]);

  const service = new CustomFieldValuesService(
    prisma as never,
    definitionsRepo as never,
    valuesRepo as never,
    { customFieldsWrittenTotal: jest.fn() } as never,
    { emitCustomFieldChanged: jest.fn() } as never,
  );

  return { service, txMock, upserts };
}

describe('Engine de ROLLUP', () => {
  describe('Trigger via RELATIONSHIP withQuantity', () => {
    it('calcula soma de custo × quantidade ao gravar items', async () => {
      const h = buildHarness({
        triggerDefinition: relationshipDef,
        relationshipItems: [
          { taskId: INSUMO_A, quantity: 10 },
          { taskId: INSUMO_B, quantity: 4 },
        ],
        insumoCosts: new Map([
          [INSUMO_A, 35],
          [INSUMO_B, 3],
        ]),
      });

      await h.service.setValue(
        WS,
        PRODUCT_TASK,
        REL_DEF_ID,
        [
          { taskId: INSUMO_A, quantity: 10 },
          { taskId: INSUMO_B, quantity: 4 },
        ],
        ACTOR,
      );

      const rollupUpsert = h.upserts.find(
        (u) => u.definitionId === ROLLUP_DEF_ID && u.taskId === PRODUCT_TASK,
      );
      expect(rollupUpsert?.value).toBe(362);
    });

    it('dispara cascata Vista e Prazo após calcular ROLLUP', async () => {
      const h = buildHarness({
        triggerDefinition: relationshipDef,
        relationshipItems: [{ taskId: INSUMO_A, quantity: 10 }],
        insumoCosts: new Map([[INSUMO_A, 100]]),
      });

      await h.service.setValue(
        WS,
        PRODUCT_TASK,
        REL_DEF_ID,
        [{ taskId: INSUMO_A, quantity: 10 }],
        ACTOR,
      );

      const cash = h.upserts.find((u) => u.definitionId === CASH_DEF_ID);
      const term = h.upserts.find((u) => u.definitionId === TERM_DEF_ID);
      expect(cash?.value).toBe(1500);
      expect(term?.value).toBe(1764.71);
    });

    it('insumo sem custo preenchido conta como 0', async () => {
      const h = buildHarness({
        triggerDefinition: relationshipDef,
        relationshipItems: [
          { taskId: INSUMO_A, quantity: 10 },
          { taskId: INSUMO_B, quantity: 5 },
        ],
        insumoCosts: new Map([[INSUMO_A, 50]]),
      });

      await h.service.setValue(
        WS,
        PRODUCT_TASK,
        REL_DEF_ID,
        [
          { taskId: INSUMO_A, quantity: 10 },
          { taskId: INSUMO_B, quantity: 5 },
        ],
        ACTOR,
      );

      const rollup = h.upserts.find((u) => u.definitionId === ROLLUP_DEF_ID);
      expect(rollup?.value).toBe(500);
    });

    it('lista vazia zera o ROLLUP', async () => {
      const h = buildHarness({
        triggerDefinition: relationshipDef,
        relationshipItems: [],
        insumoCosts: new Map(),
        previousRollup: 500,
      });

      await h.service.setValue(WS, PRODUCT_TASK, REL_DEF_ID, [], ACTOR);

      const rollup = h.upserts.find((u) => u.definitionId === ROLLUP_DEF_ID);
      expect(rollup?.value).toBe(0);
    });

    it('arredonda total pra 2 casas decimais', async () => {
      const h = buildHarness({
        triggerDefinition: relationshipDef,
        relationshipItems: [{ taskId: INSUMO_A, quantity: 3 }],
        insumoCosts: new Map([[INSUMO_A, 33.333]]),
      });

      await h.service.setValue(
        WS,
        PRODUCT_TASK,
        REL_DEF_ID,
        [{ taskId: INSUMO_A, quantity: 3 }],
        ACTOR,
      );

      const rollup = h.upserts.find((u) => u.definitionId === ROLLUP_DEF_ID);
      expect(rollup?.value).toBe(100);
    });
  });

  describe('Cascata reversa via CURRENCY de insumo', () => {
    it('recalcula ROLLUP de todos os produtos que linkam o insumo alterado', async () => {
      const h = buildHarness({
        triggerDefinition: costDef,
        productsLinkingInsumo: ['task-product-1', 'task-product-2'],
        relationshipItems: [{ taskId: INSUMO_A, quantity: 2 }],
        insumoCosts: new Map([[INSUMO_A, 75]]),
      });

      await h.service.setValue(WS, INSUMO_A, COST_DEF_ID, 75, ACTOR);

      const rollupUpserts = h.upserts.filter(
        (u) => u.definitionId === ROLLUP_DEF_ID,
      );
      expect(rollupUpserts.length).toBeGreaterThanOrEqual(2);
    });
  });
});
