/**
 * Unit tests — DashboardCardQueryService
 *
 * Focus: security-oriented coverage derived from the Kommo query engine
 * threat model (`docs/threat-model-kommo.md`). Two P1 bugs motivated this
 * file (owner: Hugo Monteiro — QA + Security + Seed senior, squad-dashboards):
 *
 *   - T-T4 (Bug #1): `operatorToPrisma` default branch must throw, not
 *     return the raw value. Unknown/injection-style operators must be
 *     rejected deterministically.
 *   - T-I4 (Bug #2): `executeTable` must use an explicit `select` clause
 *     so Prisma never materializes sensitive columns (`workspaceId`,
 *     `deletedAt`, tokens, raw payloads) into the HTTP response.
 *
 * Also adds preventive coverage for:
 *   - SUPPORTED_ENTITIES whitelist enforcement (rejects path traversal,
 *     case variants, SQL injection, unsupported entities).
 *   - workspaceId scoping invariants. NOTE: the current
 *     `DashboardCardQueryService.execute()` signature does NOT receive a
 *     `workspaceId`. Scoping relies on the caller (DashboardsService) and
 *     on `buildWhere` silently ignoring a `workspaceId` filter field (it
 *     is absent from ALLOWED_FIELDS for every entity). The tests below
 *     encode that contract explicitly so any regression (adding
 *     `workspaceId` to an ALLOWED_FIELDS set) is caught. Moving real
 *     tenant scoping into this service is a separate follow-up (see
 *     threat model T-T6 and open question §6 / #8 in threat-model-kommo.md).
 *
 * Style: jest + @nestjs/testing, mirroring the existing
 * `departments.service.spec.ts` template used across the project.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  DashboardCardQueryService,
  type DataSource,
  type AxisConfig,
  type GlobalFilter,
} from './dashboard-card-query.service';
import { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Prisma delegate mock shape
// ---------------------------------------------------------------------------

type DelegateMock = {
  findMany: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
  count: jest.Mock;
};

function buildDelegateMock(): DelegateMock {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: { totalCents: 0 } }),
    groupBy: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };
}

function buildPrismaMock() {
  return {
    order: buildDelegateMock(),
    accountReceivable: buildDelegateMock(),
    accountPayable: buildDelegateMock(),
    product: buildDelegateMock(),
    productionOrder: buildDelegateMock(),
    invoice: buildDelegateMock(),
    client: buildDelegateMock(),
  };
}

type PrismaMock = ReturnType<typeof buildPrismaMock>;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('DashboardCardQueryService', () => {
  let service: DashboardCardQueryService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardCardQueryService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(DashboardCardQueryService);
  });

  // ---------------------------------------------------------------------
  // 1. T-T4 — operatorToPrisma must reject non-whitelisted operators
  // ---------------------------------------------------------------------

  describe('operatorToPrisma security (T-T4)', () => {
    // The service method is private; we exercise it indirectly via
    // `execute()` passing a global filter with the target operator. The
    // filter field is chosen from a valid ALLOWED_FIELDS entry
    // ('status' for 'orders') so the operator branch is the only thing
    // under test.
    const baseDataSource: DataSource = { entity: 'orders' };
    const axis: AxisConfig | null = null;

    const callWithOperator = (operator: string) =>
      service.execute('KPI_NUMBER', baseDataSource, axis, null, [
        { field: 'status', operator, value: 'OPEN' },
      ]);

    it('rejects unknown operator "FOO" with BadRequestException', async () => {
      await expect(callWithOperator('FOO')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects non-whitelisted uppercase variant "LIKE"', async () => {
      await expect(callWithOperator('LIKE')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects SQL-injection-style operator', async () => {
      await expect(
        callWithOperator("'; DROP TABLE users--"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects MongoDB-style operator "$ne"', async () => {
      await expect(callWithOperator('$ne')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects empty string operator', async () => {
      await expect(callWithOperator('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects lowercase variant "equals" (whitelist is case-sensitive)', async () => {
      await expect(callWithOperator('equals')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts all 6 whitelisted operators without throwing', async () => {
      const whitelisted: Array<{ op: string; value: unknown }> = [
        { op: 'EQUALS', value: 'OPEN' },
        { op: 'NOT_EQUALS', value: 'OPEN' },
        { op: 'GREATER', value: 100 },
        { op: 'LESS', value: 100 },
        { op: 'BETWEEN', value: [100, 200] },
        { op: 'IN', value: ['OPEN', 'CLOSED'] },
      ];

      for (const { op, value } of whitelisted) {
        await expect(
          service.execute('KPI_NUMBER', baseDataSource, axis, null, [
            { field: 'status', operator: op, value },
          ]),
        ).resolves.toBeDefined();
      }
    });

    it('error message lists the allowed operators (helps API consumers)', async () => {
      await expect(callWithOperator('RAW')).rejects.toThrow(
        /EQUALS.*NOT_EQUALS.*GREATER.*LESS.*BETWEEN.*IN/s,
      );
    });
  });

  // ---------------------------------------------------------------------
  // 2. T-I4 — executeTable must never leak non-whitelisted columns
  // ---------------------------------------------------------------------

  describe('executeTable column leak prevention (T-I4)', () => {
    // Seeds the delegate with a row that includes sensitive columns. The
    // assertion runs against what the service REQUESTED from Prisma
    // (via `select`) — because real Prisma honors `select`, the response
    // shape is determined by that select. We assert both:
    //   a) the Prisma call used an explicit `select` allowlist;
    //   b) the returned `columns[]` never includes forbidden names.

    type LeakRow = Record<string, unknown>;

    const runTableFor = async (
      entity: string,
      delegateKey: keyof PrismaMock,
      rowSeed: LeakRow,
    ) => {
      prisma[delegateKey].findMany.mockResolvedValueOnce([rowSeed]);
      const result = await service.execute(
        'TABLE',
        { entity },
        null,
        null,
        [],
      );
      return result as { columns: string[]; rows: LeakRow[] };
    };

    const FORBIDDEN_COLUMNS = [
      'workspaceId',
      'deletedAt',
      'accountId',
      'kommoAccountId',
      'hmacSecret',
      'accessToken',
      'refreshToken',
      'rawPayload',
      'rawMetadata',
      'secretInternalField',
    ];

    const assertNoLeakInColumns = (columns: string[]) => {
      for (const bad of FORBIDDEN_COLUMNS) {
        expect(columns).not.toContain(bad);
      }
    };

    it('never returns workspaceId in table columns (orders)', async () => {
      const result = await runTableFor('orders', 'order', {
        id: 'o-1',
        status: 'OPEN',
        workspaceId: 'ws-secret',
      });

      expect(result.columns).toContain('id');
      expect(result.columns).toContain('status');
      expect(result.columns).not.toContain('workspaceId');
    });

    it('never returns deletedAt in table columns (orders)', async () => {
      const result = await runTableFor('orders', 'order', {
        id: 'o-1',
        status: 'OPEN',
        deletedAt: new Date(),
      });

      expect(result.columns).not.toContain('deletedAt');
    });

    it('issues findMany with an explicit select allowlist (never bare where)', async () => {
      await runTableFor('orders', 'order', { id: 'o-1', status: 'OPEN' });

      expect(prisma.order.findMany).toHaveBeenCalledTimes(1);
      const callArg = prisma.order.findMany.mock.calls[0][0];
      expect(callArg).toHaveProperty('select');
      expect(typeof callArg.select).toBe('object');
      expect(callArg.select).not.toBeNull();

      // Defense-in-depth: the select object must NOT include any
      // forbidden column as a truthy key.
      for (const bad of FORBIDDEN_COLUMNS) {
        expect(callArg.select[bad]).toBeUndefined();
      }
    });

    it('select only contains fields in ALLOWED_FIELDS[entity] + id', async () => {
      // ALLOWED_FIELDS.orders from the service implementation.
      const expectedOrdersColumns = new Set([
        'id',
        'status',
        'clientId',
        'companyId',
        'createdByUserId',
        'assignedUserId',
        'createdAt',
        'totalCents',
        'isResale',
        'shouldProduce',
        'orderTypeId',
      ]);

      await runTableFor('orders', 'order', { id: 'o-1', status: 'OPEN' });

      const callArg = prisma.order.findMany.mock.calls[0][0];
      const selectedKeys = Object.keys(callArg.select);

      for (const k of selectedKeys) {
        expect(expectedOrdersColumns.has(k)).toBe(true);
      }
    });

    it('returns empty columns/rows for zero-result query (no leak vector)', async () => {
      prisma.order.findMany.mockResolvedValueOnce([]);
      const result = (await service.execute(
        'TABLE',
        { entity: 'orders' },
        null,
        null,
        [],
      )) as { columns: string[]; rows: unknown[] };

      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it.each([
      ['orders', 'order'],
      ['accounts_receivable', 'accountReceivable'],
      ['accounts_payable', 'accountPayable'],
      ['products', 'product'],
      ['production_orders', 'productionOrder'],
      ['invoices', 'invoice'],
      ['clients', 'client'],
    ] as const)(
      'every SUPPORTED_ENTITIES entry (%s) is leak-free',
      async (entity, delegateKey) => {
        const leakyRow: LeakRow = {
          id: 'x-1',
          workspaceId: 'ws-secret',
          deletedAt: new Date(),
          hmacSecret: 'never-leak',
          accessToken: 'never-leak',
          refreshToken: 'never-leak',
          rawPayload: { secrets: 'inside' },
          rawMetadata: { secrets: 'inside' },
          secretInternalField: 'should-not-appear',
        };

        const result = await runTableFor(entity, delegateKey, leakyRow);
        assertNoLeakInColumns(result.columns);

        // Also confirm the select did not request any forbidden column.
        const callArg = prisma[delegateKey].findMany.mock.calls[0][0];
        for (const bad of FORBIDDEN_COLUMNS) {
          expect(callArg.select[bad]).toBeUndefined();
        }
      },
    );

    it('always caps result set (take <= 100) to avoid unbounded tables', async () => {
      await runTableFor('orders', 'order', { id: 'o-1', status: 'OPEN' });
      const callArg = prisma.order.findMany.mock.calls[0][0];
      expect(callArg.take).toBeLessThanOrEqual(100);
    });

    // TODO: when DTO introduces `axisConfig.columns` (user-facing column
    // picker), add test that the effective column set is the INTERSECTION
    // of the requested columns and ALLOWED_FIELDS[entity] — never the
    // union. Design currently does not expose that knob (see threat-model
    // T-I4 mitigations 1 and 2).
  });

  // ---------------------------------------------------------------------
  // 3. workspaceId scoping invariants
  // ---------------------------------------------------------------------

  describe('workspaceId scoping invariants', () => {
    // Architectural note: DashboardCardQueryService.execute() does NOT
    // receive a workspaceId. Tenant scoping is performed upstream by
    // DashboardsService (findById/findCardById filter by workspaceId). The
    // safety property encoded here is: when the engine builds a WHERE
    // clause, it must NEVER accept a user-controlled `workspaceId` filter
    // that could rewrite or override scoping. `workspaceId` is absent from
    // every ALLOWED_FIELDS set — tests below pin that invariant.

    const captureWhere = (delegate: DelegateMock): Record<string, unknown> => {
      // KPI_NUMBER with id (count) path → delegate.count({ where })
      if (delegate.count.mock.calls.length > 0) {
        return delegate.count.mock.calls[0][0].where;
      }
      if (delegate.aggregate.mock.calls.length > 0) {
        return delegate.aggregate.mock.calls[0][0].where;
      }
      if (delegate.findMany.mock.calls.length > 0) {
        return delegate.findMany.mock.calls[0][0].where;
      }
      if (delegate.groupBy.mock.calls.length > 0) {
        return delegate.groupBy.mock.calls[0][0].where;
      }
      throw new Error('No delegate call was captured');
    };

    it('rejects a global filter with field="workspaceId" by silently dropping it', async () => {
      await service.execute(
        'TABLE',
        { entity: 'orders' },
        null,
        null,
        [
          { field: 'workspaceId', operator: 'EQUALS', value: 'spoofed-ws-id' },
        ],
      );

      const where = captureWhere(prisma.order);
      expect(where).not.toHaveProperty('workspaceId');
    });

    it('rejects cardFilters.workspaceId by silently dropping it', async () => {
      await service.execute(
        'TABLE',
        { entity: 'orders' },
        null,
        { workspaceId: 'spoofed-ws-id', status: 'OPEN' },
        [],
      );

      const where = captureWhere(prisma.order);
      expect(where).not.toHaveProperty('workspaceId');
      expect(where.status).toBe('OPEN');
    });

    it('rejects cardFilters.deletedAt override (soft-delete scope is locked)', async () => {
      await service.execute(
        'TABLE',
        { entity: 'orders' },
        null,
        { deletedAt: { not: null } },
        [],
      );

      const where = captureWhere(prisma.order);
      // buildWhere hardcodes deletedAt: null — user cannot override.
      expect(where.deletedAt).toBeNull();
    });

    it('applies deletedAt: null as the default soft-delete guard for KPI_NUMBER', async () => {
      await service.execute(
        'KPI_NUMBER',
        { entity: 'orders' },
        { yField: 'id' },
        null,
        [],
      );

      const where = captureWhere(prisma.order);
      expect(where.deletedAt).toBeNull();
    });

    it('applies deletedAt: null as the default soft-delete guard for BAR_CHART', async () => {
      prisma.order.groupBy.mockResolvedValueOnce([]);
      await service.execute(
        'BAR_CHART',
        { entity: 'orders' },
        { groupBy: 'status', yField: 'totalCents' },
        null,
        [],
      );

      const where = captureWhere(prisma.order);
      expect(where.deletedAt).toBeNull();
    });

    it('applies deletedAt: null as the default soft-delete guard for LINE_CHART', async () => {
      prisma.order.findMany.mockResolvedValueOnce([]);
      await service.execute(
        'LINE_CHART',
        { entity: 'orders' },
        { xField: 'createdAt', yField: 'totalCents' },
        null,
        [],
      );

      const where = captureWhere(prisma.order);
      expect(where.deletedAt).toBeNull();
    });

    it('applies deletedAt: null as the default soft-delete guard for TABLE', async () => {
      await service.execute('TABLE', { entity: 'orders' }, null, null, []);

      const where = captureWhere(prisma.order);
      expect(where.deletedAt).toBeNull();
    });
  });

  // ---------------------------------------------------------------------
  // 4. SUPPORTED_ENTITIES whitelist enforcement
  // ---------------------------------------------------------------------

  describe('SUPPORTED_ENTITIES whitelist enforcement', () => {
    const callWithEntity = (entity: string) =>
      service.execute(
        'KPI_NUMBER',
        { entity } as DataSource,
        null,
        null,
        [],
      );

    it('rejects path-traversal-style entity', async () => {
      await expect(callWithEntity('../../orders')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects unsupported entity "users"', async () => {
      await expect(callWithEntity('users')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects future-but-not-yet-wired entity "kommoConversations"', async () => {
      // Pre-Kommo-wiring: the entity is NOT in SUPPORTED_ENTITIES. When
      // Sprint 2 adds Kommo adapters, this test should be updated (or
      // removed) and a positive counterpart added. Keeping it here
      // documents the contract boundary.
      await expect(
        callWithEntity('kommoConversations'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects SQL-injection entity payload', async () => {
      await expect(
        callWithEntity('orders; DROP TABLE users'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty entity string', async () => {
      await expect(callWithEntity('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects whitespace-padded entity (normalization is lowercase-only, not trim)', async () => {
      // normalizeEntity does toLowerCase() but does NOT .trim(). An
      // attacker supplying " orders" should not match "orders".
      await expect(callWithEntity(' orders')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(callWithEntity('orders ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts all 7 canonical entities via their camelCase/snake_case forms', async () => {
      const valid = [
        'orders',
        'accounts_receivable',
        'accounts_payable',
        'products',
        'production_orders',
        'invoices',
        'clients',
      ];
      for (const e of valid) {
        await expect(callWithEntity(e)).resolves.toBeDefined();
      }
    });

    it('accepts case-insensitive valid entity ("ORDERS" is normalized)', async () => {
      // Current normalizeEntity uses .toLowerCase(). Threat model §6 Open
      // Question 2 proposes removing case-insensitivity for Kommo
      // entities; until that is adopted, this test PINS the current
      // behavior so any change is a deliberate contract decision.
      await expect(callWithEntity('ORDERS')).resolves.toBeDefined();
    });
  });

  // ---------------------------------------------------------------------
  // 5. Filter merge intersection — ADR-008
  // ---------------------------------------------------------------------
  //
  // Context: P0 bug found by Renata Pires — `buildWhere` iterates
  // cardFilters and then globalFilters into the same `where` object, so a
  // global filter on the SAME field silently OVERWRITES the card's narrower
  // filter (e.g. card `status=OPEN` + global `status IN [OPEN, CLOSED]`
  // expanded the authorized scope). ADR-008
  // (`dashboards-filter-merge-intersection`) pins the fix:
  //
  //   - Invariant: merge is always INTERSECTION (AND lógico). Global filter
  //     can only restrict the card's authorized scope, never expand it.
  //   - Empty intersection → sentinel `EMPTY_INTERSECTION` short-circuits
  //     the executor, returning the CardType-specific empty-result shape
  //     without executing Prisma.
  //   - Same-field conflict is resolved BEFORE `operatorToPrisma` via a
  //     pure helper `utils/merge-filters.ts` (Renata's parallel work).
  //
  // These tests are black-box via `service.execute()` — robust to helper
  // refactors. Direct imports of `mergeFilters` / `EMPTY_INTERSECTION` are
  // deliberately avoided so the spec doesn't require the helper file to
  // exist at import time.
  //
  // Spec reference: `docs/kommo-pipelineid-filter.md` §4 (table of cases
  // A–E) and the empty-result shape table.

  describe('Filter merge intersection — ADR-008', () => {
    // Helpers reused across subdescribes
    const captureWhere = (delegate: DelegateMock): Record<string, unknown> => {
      if (delegate.count.mock.calls.length > 0) {
        return delegate.count.mock.calls[0][0].where;
      }
      if (delegate.aggregate.mock.calls.length > 0) {
        return delegate.aggregate.mock.calls[0][0].where;
      }
      if (delegate.findMany.mock.calls.length > 0) {
        return delegate.findMany.mock.calls[0][0].where;
      }
      if (delegate.groupBy.mock.calls.length > 0) {
        return delegate.groupBy.mock.calls[0][0].where;
      }
      throw new Error('No delegate call was captured');
    };

    const anyDelegateCalled = (delegate: DelegateMock): boolean =>
      delegate.count.mock.calls.length > 0 ||
      delegate.aggregate.mock.calls.length > 0 ||
      delegate.findMany.mock.calls.length > 0 ||
      delegate.groupBy.mock.calls.length > 0;

    // -----------------------------------------------------------------
    // 5.1 same-field conflict (set-based operators)
    // -----------------------------------------------------------------
    //
    // Field chosen: `status` (present in ALLOWED_FIELDS.orders). Values
    // `p1`/`p2`/`p3` are placeholders modeling pipelineId-like cuids; the
    // set semantics are field-agnostic so `status` is an adequate proxy
    // for the pipelineId case described in the spec §4 table.

    describe('same-field conflict', () => {
      it('card EQUALS p1 + global EQUALS p1 → applies once (redundant)', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: 'p1' },
          [{ field: 'status', operator: 'EQUALS', value: 'p1' }],
        );

        const where = captureWhere(prisma.order);
        // Redundant filter collapses to a single equality. Accept either
        // the raw scalar (most natural post-merge) or a Prisma `equals`
        // object — helper implementation detail.
        const status = where.status;
        const resolvesToP1 =
          status === 'p1' ||
          (typeof status === 'object' &&
            status !== null &&
            (status as Record<string, unknown>).equals === 'p1') ||
          (typeof status === 'object' &&
            status !== null &&
            Array.isArray((status as Record<string, unknown>).in) &&
            ((status as Record<string, unknown>).in as unknown[]).length ===
              1 &&
            ((status as Record<string, unknown>).in as unknown[])[0] === 'p1');
        expect(resolvesToP1).toBe(true);
      });

      it('card EQUALS p1 + global EQUALS p2 → empty result (EMPTY_INTERSECTION) for KPI_NUMBER', async () => {
        // Seed aggregate with a non-zero value to prove the executor
        // short-circuited (otherwise the mock would leak through).
        prisma.order.count.mockResolvedValueOnce(42);
        prisma.order.aggregate.mockResolvedValueOnce({
          _sum: { totalCents: 999 },
        });

        const result = (await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: 'p1' },
          [{ field: 'status', operator: 'EQUALS', value: 'p2' }],
        )) as { value: number; label: string };

        expect(result).toEqual({ value: 0, label: expect.any(String) });
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('card IN [p1,p2] + global IN [p2,p3] → intersects to IN [p2]', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          null,
          [
            { field: 'status', operator: 'IN', value: ['p1', 'p2'] },
            // Second filter on same field simulates cardFilters when
            // cardFilters is null — use only globalFilters with two
            // entries on same field to exercise helper's intersection
            // logic from global side. Alternative below covers the
            // card × global cross-source case.
          ],
        );

        // When both values come from globalFilters, last-write wins in
        // the old buggy code (value=[p1,p2] used for same reason). To
        // truly exercise card × global intersection we need a second
        // call that uses cardFilters.status. See the next assertion.
        prisma.order.count.mockClear();

        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: { in: ['p1', 'p2'] } },
          [{ field: 'status', operator: 'IN', value: ['p2', 'p3'] }],
        );

        const where = captureWhere(prisma.order);
        const status = where.status as Record<string, unknown>;
        // Accept several canonical forms: { in: ['p2'] }, 'p2', or
        // { equals: 'p2' }. The semantic invariant is the cardinality-1
        // intersection { p2 }.
        const inArr = Array.isArray(status?.in)
          ? (status.in as unknown[])
          : null;
        const isSinglePrismaIn = inArr?.length === 1 && inArr[0] === 'p2';
        const isScalar = status === ('p2' as unknown);
        const isEquals =
          status &&
          typeof status === 'object' &&
          (status as Record<string, unknown>).equals === 'p2';
        expect(isSinglePrismaIn || isScalar || isEquals).toBe(true);
      });

      it('card IN [p1] + global IN [p2] → empty result (EMPTY_INTERSECTION)', async () => {
        prisma.order.count.mockResolvedValueOnce(99);

        const result = (await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: { in: ['p1'] } },
          [{ field: 'status', operator: 'IN', value: ['p2'] }],
        )) as { value: number; label: string };

        expect(result.value).toBe(0);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('card EQUALS p1 + global IN [p1,p2] → resolves to EQUALS p1 (global cannot amplify)', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: 'p1' },
          [{ field: 'status', operator: 'IN', value: ['p1', 'p2'] }],
        );

        const where = captureWhere(prisma.order);
        const status = where.status as unknown;
        const inArr =
          status && typeof status === 'object'
            ? ((status as Record<string, unknown>).in as unknown[] | undefined)
            : undefined;
        const resolvesToP1 =
          status === 'p1' ||
          (inArr?.length === 1 && inArr[0] === 'p1') ||
          (status &&
            typeof status === 'object' &&
            (status as Record<string, unknown>).equals === 'p1');
        expect(resolvesToP1).toBe(true);
      });

      it('card EQUALS p1 + global IN [p2,p3] → empty result (p1 outside global IN)', async () => {
        prisma.order.count.mockResolvedValueOnce(5);

        const result = (await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: 'p1' },
          [{ field: 'status', operator: 'IN', value: ['p2', 'p3'] }],
        )) as { value: number; label: string };

        expect(result.value).toBe(0);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('card IN [p1,p2] + global EQUALS p1 → resolves to EQUALS p1', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: { in: ['p1', 'p2'] } },
          [{ field: 'status', operator: 'EQUALS', value: 'p1' }],
        );

        const where = captureWhere(prisma.order);
        const status = where.status as unknown;
        const inArr =
          status && typeof status === 'object'
            ? ((status as Record<string, unknown>).in as unknown[] | undefined)
            : undefined;
        const resolvesToP1 =
          status === 'p1' ||
          (inArr?.length === 1 && inArr[0] === 'p1') ||
          (status &&
            typeof status === 'object' &&
            (status as Record<string, unknown>).equals === 'p1');
        expect(resolvesToP1).toBe(true);
      });

      it('card IN [p1,p2] + global EQUALS p3 → empty result', async () => {
        prisma.order.count.mockResolvedValueOnce(12);

        const result = (await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: { in: ['p1', 'p2'] } },
          [{ field: 'status', operator: 'EQUALS', value: 'p3' }],
        )) as { value: number; label: string };

        expect(result.value).toBe(0);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });
    });

    // -----------------------------------------------------------------
    // 5.2 same-field comparative operators (AND composition in Prisma)
    // -----------------------------------------------------------------
    //
    // For numeric range operators, intersection is NOT set-based; Prisma
    // natively supports composite ranges (`{ gt: 10, lt: 100 }`), so the
    // helper is free to AND them into a single where-clause. We pin the
    // composite shape — no short-circuit expected.

    describe('same-field comparative operators', () => {
      it('card GREATER 10 + global LESS 100 → applies both via AND', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'totalCents' },
          { totalCents: { gt: 10 } },
          [{ field: 'totalCents', operator: 'LESS', value: 100 }],
        );

        const where = captureWhere(prisma.order);
        const tc = where.totalCents as Record<string, unknown>;
        expect(tc).toBeDefined();
        expect(tc.gt).toBe(10);
        expect(tc.lt).toBe(100);
      });

      it('card BETWEEN [10,50] + global GREATER 30 → applies both via AND (intersection: gte=30, lte=50)', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'totalCents' },
          { totalCents: { gte: 10, lte: 50 } },
          [{ field: 'totalCents', operator: 'GREATER', value: 30 }],
        );

        const where = captureWhere(prisma.order);
        const tc = where.totalCents as Record<string, unknown>;
        expect(tc).toBeDefined();
        // Accept either a strict intersection (gte=30, lte=50) OR the
        // looser AND composition (gte=10, lte=50, gt=30) — Prisma
        // evaluates both identically. The helper may pick either shape.
        const intersected = tc.gte === 30 && tc.lte === 50;
        const composed =
          (tc.gte === 10 || tc.gte === 30) &&
          tc.lte === 50 &&
          (tc.gt === 30 || tc.gte === 30);
        expect(intersected || composed).toBe(true);
      });
    });

    // -----------------------------------------------------------------
    // 5.3 different fields — comportamento já correto (baseline)
    // -----------------------------------------------------------------

    describe('different fields', () => {
      it('card status=OPEN + global clientId IN [c1] → both applied as AND', async () => {
        await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          { status: 'OPEN' },
          [{ field: 'clientId', operator: 'IN', value: ['c1'] }],
        );

        const where = captureWhere(prisma.order);
        expect(where.status).toBe('OPEN');
        const clientId = where.clientId as Record<string, unknown>;
        expect(clientId).toBeDefined();
        expect(clientId.in).toEqual(['c1']);
        // Soft-delete guard still present.
        expect(where.deletedAt).toBeNull();
      });
    });

    // -----------------------------------------------------------------
    // 5.4 empty-result shape per CardType (table-driven)
    // -----------------------------------------------------------------
    //
    // Every CardType must honor the sentinel and return its empty shape
    // without executing Prisma. Conflict recipe: card EQUALS 'p1' +
    // global EQUALS 'p2' on `status`.

    describe('empty-result shape per CardType', () => {
      const conflictCard: Record<string, unknown> = { status: 'p1' };
      const conflictGlobal = [
        { field: 'status', operator: 'EQUALS', value: 'p2' },
      ];

      it('KPI_NUMBER: empty intersection returns { value: 0, label }', async () => {
        prisma.order.count.mockResolvedValueOnce(42);
        prisma.order.aggregate.mockResolvedValueOnce({
          _sum: { totalCents: 7 },
        });

        const result = (await service.execute(
          'KPI_NUMBER',
          { entity: 'orders' },
          { yField: 'id' },
          conflictCard,
          conflictGlobal,
        )) as { value: number; label: string };

        expect(result.value).toBe(0);
        expect(typeof result.label).toBe('string');
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('TABLE: empty intersection returns { columns: [...], rows: [] }', async () => {
        prisma.order.findMany.mockResolvedValueOnce([
          { id: 'o-1', status: 'p2' },
        ]);

        const result = (await service.execute(
          'TABLE',
          { entity: 'orders' },
          null,
          conflictCard,
          conflictGlobal,
        )) as { columns: string[]; rows: unknown[] };

        // Rows MUST be empty. Columns: spec §4 allows either [] (no
        // rows → no header inference) or the ALLOWED_FIELDS whitelist
        // (stable header even for empty table). Both are acceptable
        // empty-result shapes.
        expect(result.rows).toEqual([]);
        expect(Array.isArray(result.columns)).toBe(true);
        // If columns come from whitelist, they must exclude leak-prone
        // fields (defense-in-depth, cf. T-I4).
        expect(result.columns).not.toContain('workspaceId');
        expect(result.columns).not.toContain('deletedAt');
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('BAR_CHART: empty intersection returns []', async () => {
        prisma.order.groupBy.mockResolvedValueOnce([
          { status: 'p2', _count: 10 },
        ]);

        const result = (await service.execute(
          'BAR_CHART',
          { entity: 'orders' },
          { groupBy: 'status', yField: 'id' },
          conflictCard,
          conflictGlobal,
        )) as unknown[];

        expect(result).toEqual([]);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('LINE_CHART: empty intersection returns []', async () => {
        prisma.order.findMany.mockResolvedValueOnce([
          { createdAt: new Date('2026-01-01'), totalCents: 100 },
        ]);

        const result = (await service.execute(
          'LINE_CHART',
          { entity: 'orders' },
          { xField: 'createdAt', yField: 'totalCents' },
          conflictCard,
          conflictGlobal,
        )) as unknown[];

        expect(result).toEqual([]);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('PIE_CHART: empty intersection returns []', async () => {
        prisma.order.groupBy.mockResolvedValueOnce([
          { status: 'p2', _count: 5 },
        ]);

        const result = (await service.execute(
          'PIE_CHART',
          { entity: 'orders' },
          { groupBy: 'status', yField: 'id' },
          conflictCard,
          conflictGlobal,
        )) as unknown[];

        expect(result).toEqual([]);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('DONUT: empty intersection returns []', async () => {
        prisma.order.groupBy.mockResolvedValueOnce([
          { status: 'p2', _count: 5 },
        ]);

        const result = (await service.execute(
          'DONUT',
          { entity: 'orders' },
          { groupBy: 'status', yField: 'id' },
          conflictCard,
          conflictGlobal,
        )) as unknown[];

        expect(result).toEqual([]);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('AREA_CHART: empty intersection returns []', async () => {
        prisma.order.findMany.mockResolvedValueOnce([
          { createdAt: new Date('2026-01-01'), totalCents: 100 },
        ]);

        const result = (await service.execute(
          'AREA_CHART',
          { entity: 'orders' },
          { xField: 'createdAt', yField: 'totalCents' },
          conflictCard,
          conflictGlobal,
        )) as unknown[];

        expect(result).toEqual([]);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });

      it('STACKED_BAR: empty intersection returns []', async () => {
        prisma.order.groupBy.mockResolvedValueOnce([
          { status: 'p2', _count: 5 },
        ]);

        const result = (await service.execute(
          'STACKED_BAR',
          { entity: 'orders' },
          { groupBy: 'status', yField: 'id' },
          conflictCard,
          conflictGlobal,
        )) as unknown[];

        expect(result).toEqual([]);
        expect(anyDelegateCalled(prisma.order)).toBe(false);
      });
    });

    // -----------------------------------------------------------------
    // 5.5 Security invariant — global filter cannot amplify card scope
    // -----------------------------------------------------------------
    //
    // This is the root of the P0: even if Prisma were somehow queried
    // with the expanded scope, the result must never contain a row
    // forbidden by the card's narrower scope. Two-pronged assertion:
    //   1) the captured Prisma `where` restricts to the intersection;
    //   2) no row with value outside the card's allowed set leaks
    //      through the service response.

    describe('global filter cannot amplify card scope (security invariant)', () => {
      it('card EQUALS p1 + global IN [p1,p2]: query never broadens to include p2', async () => {
        // Malicious mock: if the service queried with a where that
        // allowed p2, a row with status=p2 would be returned.
        prisma.order.findMany.mockResolvedValueOnce([
          { id: 'o-1', status: 'p2' }, // forbidden by card scope
        ]);

        const result = (await service.execute(
          'TABLE',
          { entity: 'orders' },
          null,
          { status: 'p1' },
          [{ field: 'status', operator: 'IN', value: ['p1', 'p2'] }],
        )) as { columns: string[]; rows: Record<string, unknown>[] };

        // Two valid outcomes, both secure:
        //   (a) query captured as `status: 'p1'` (or `{ equals: 'p1' }`
        //       or `{ in: ['p1'] }`) — narrow scope, real Prisma would
        //       have filtered out the p2 row. Mock may still return it
        //       (mocks don't honor `where`), but the where proves the
        //       real DB would have filtered.
        //   (b) the service short-circuited and returned empty rows
        //       without calling Prisma (not expected for non-empty
        //       intersection, but accepted as a safer alternative).
        if (prisma.order.findMany.mock.calls.length > 0) {
          const where = captureWhere(prisma.order);
          const status = where.status as unknown;
          const inArr =
            status && typeof status === 'object'
              ? ((status as Record<string, unknown>).in as
                  | unknown[]
                  | undefined)
              : undefined;
          const narrowsToP1 =
            status === 'p1' ||
            (inArr?.length === 1 && inArr[0] === 'p1') ||
            (status &&
              typeof status === 'object' &&
              (status as Record<string, unknown>).equals === 'p1');
          expect(narrowsToP1).toBe(true);
          // Critical: the where MUST NOT expose p2 in any IN array.
          if (inArr) {
            expect(inArr).not.toContain('p2');
          }
        } else {
          // Short-circuit path: empty result.
          expect(result.rows).toEqual([]);
        }
      });
    });
  });
});
