/**
 * Kommo "Analytics Comercial" Dashboard Seed (Story K4-1 — squad-dashboards).
 *
 * Seeds 1 Dashboard + 8 MVP KPI cards + 1 global period filter used to
 * observe the Kommo commercial operation replicated into the Mundial ERP.
 *
 * Idempotency: uses fixed cuid-shaped IDs declared as constants, upserted via
 * `where: { id }`. Safe to run multiple times; preserves manual edits to
 * owner-controlled fields would be lost on re-seed by design (this is a
 * seed, not a migration — the ERP owner is the `workspaceId` + the admin
 * user resolved at runtime; the intent is always re-declared from code).
 *
 * Soft delete: this seed NEVER writes `deletedAt`. If the dashboard was
 * soft-deleted by an end-user, the upsert will resurrect it with
 * `deletedAt: null` — intentional, the seed is authoritative for presence.
 *
 * Dynamic filter placeholders: this seed encodes placeholders like
 * `{{startOfDay}}`, `{{endOfDay}}`, `vs_last_week`, `resolution_rate_7d`,
 * `avg_first_response_minutes`, `total_resolved_alltime`. The seed only
 * declares intent — the `DashboardCardQueryService` (owned by Thales Rocha
 * in the kommo adapters) is responsible for resolving those placeholders at
 * query time against `KommoMetricSnapshot` (metric keys) or against
 * "now-derived" date windows. This file is a contract of intent, not a
 * runtime behaviour.
 *
 * Consumed entities (whitelist — confirmed with Thales Rocha):
 *   - `kommoConversations`
 *   - `kommoMessages`
 *   - `kommoLeads`
 *   - `kommoAgents` (not referenced by MVP cards, reserved for Fase 2)
 *
 * Required metric keys (handshake with squad-kommo / Larissa Bezerra):
 *   - `avg_first_response_minutes`
 *   - `resolution_rate_7d`
 *   - `total_resolved_alltime`
 * If `KommoMetricSnapshot` does not carry those keys when the card queries,
 * the renderer must degrade gracefully (empty state, not 500).
 */

import { Logger } from '@nestjs/common';
import { CardType, Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('KommoAnalyticsComercialSeed');

// ---------------------------------------------------------------------------
// Fixed IDs — enable idempotent upsert-by-id on tables without natural unique.
// cuid-shaped, lowercase alphanumeric. NEVER change these values pos-merge.
// ---------------------------------------------------------------------------

const DASHBOARD_ID = 'seedkommoanalytic0000000001';

const CARD_IDS = {
  conversasEmAberto: 'seedkommoanalytic0000card001',
  semResponsavel: 'seedkommoanalytic0000card002',
  resolvidasHoje: 'seedkommoanalytic0000card003',
  tempoMedioResposta: 'seedkommoanalytic0000card004',
  taxaResolucao: 'seedkommoanalytic0000card005',
  mensagensHoje: 'seedkommoanalytic0000card006',
  leadsHoje: 'seedkommoanalytic0000card007',
  totalResolvidas: 'seedkommoanalytic0000card008',
} as const;

const PERIOD_FILTER_ID = 'seedkommoanalytic000filter001';

const SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Grid layout — 12 columns x 2 rows. Each KPI card spans W=3, H=2.
// Row 1 (y=0):   [0..3) [3..6) [6..9) [9..12)
// Row 2 (y=2):   [0..3) [3..6) [6..9) [9..12)
// ---------------------------------------------------------------------------

const CARD_W = 3;
const CARD_H = 2;

// ---------------------------------------------------------------------------
// dataSource / filters / config shapes (intent declarations).
// The query engine resolves placeholders at request time.
// ---------------------------------------------------------------------------

type KommoEntity =
  | 'kommoConversations'
  | 'kommoMessages'
  | 'kommoLeads'
  | 'kommoAgents';

interface CardSpec {
  id: string;
  title: string;
  layoutX: number;
  layoutY: number;
  sortOrder: number;
  dataSource: Prisma.InputJsonValue;
  filters: Prisma.InputJsonValue | null;
  config: Prisma.InputJsonValue | null;
}

/**
 * `schemaVersion` e agora coluna nativa em `DashboardCard` (migration
 * `20260424_000008_dashboard_card_schema_version`, ver squad-dashboards
 * principio #5). Por isso NAO injetamos mais a chave dentro de `dataSource`
 * / `config` JSON — ela vive no campo top-level da linha. A constante
 * `SCHEMA_VERSION` local permanece e e passada ao upsert do card logo abaixo.
 */
function dataSource(
  entity: KommoEntity,
  extras: Record<string, unknown> = {},
): Prisma.InputJsonValue {
  return {
    entity,
    ...extras,
  };
}

function config(
  extras: Record<string, Prisma.InputJsonValue>,
): Prisma.InputJsonValue {
  return {
    ...extras,
  };
}

const CARD_SPECS: readonly CardSpec[] = [
  {
    id: CARD_IDS.conversasEmAberto,
    title: 'Conversas em Aberto',
    layoutX: 0,
    layoutY: 0,
    sortOrder: 1,
    dataSource: dataSource('kommoConversations'),
    filters: {
      operator: 'AND',
      conditions: [
        {
          field: 'status',
          operator: 'IN',
          value: ['OPEN', 'WAITING_RESPONSE', 'WAITING_CLIENT'],
        },
      ],
    },
    config: config({ trend: 'vs_last_week' }),
  },
  {
    id: CARD_IDS.semResponsavel,
    title: 'Sem Responsavel',
    layoutX: 3,
    layoutY: 0,
    sortOrder: 2,
    dataSource: dataSource('kommoConversations'),
    filters: {
      operator: 'AND',
      conditions: [
        { field: 'status', operator: 'NOT_EQUALS', value: 'RESOLVED' },
        { field: 'responsibleAgentId', operator: 'EQUALS', value: null },
      ],
    },
    config: null,
  },
  {
    id: CARD_IDS.resolvidasHoje,
    title: 'Resolvidas Hoje',
    layoutX: 6,
    layoutY: 0,
    sortOrder: 3,
    dataSource: dataSource('kommoConversations'),
    filters: {
      operator: 'AND',
      conditions: [
        { field: 'status', operator: 'EQUALS', value: 'RESOLVED' },
        { field: 'resolvedAt', operator: 'GREATER', value: '{{startOfDay}}' },
      ],
    },
    config: null,
  },
  {
    id: CARD_IDS.tempoMedioResposta,
    title: 'Tempo Medio de Resposta',
    layoutX: 9,
    layoutY: 0,
    sortOrder: 4,
    dataSource: dataSource('kommoConversations', {
      metricKey: 'avg_first_response_minutes',
    }),
    filters: null,
    config: config({ unit: 'min' }),
  },
  {
    id: CARD_IDS.taxaResolucao,
    title: 'Taxa de Resolucao',
    layoutX: 0,
    layoutY: 2,
    sortOrder: 5,
    dataSource: dataSource('kommoConversations', {
      metricKey: 'resolution_rate_7d',
    }),
    filters: null,
    config: config({ unit: '%', trend: 'vs_last_week' }),
  },
  {
    id: CARD_IDS.mensagensHoje,
    title: 'Mensagens Hoje',
    layoutX: 3,
    layoutY: 2,
    sortOrder: 6,
    dataSource: dataSource('kommoMessages'),
    filters: {
      operator: 'AND',
      conditions: [
        { field: 'createdAt', operator: 'GREATER', value: '{{startOfDay}}' },
      ],
    },
    config: config({ breakdown: 'direction' }),
  },
  {
    id: CARD_IDS.leadsHoje,
    title: 'Leads Hoje',
    layoutX: 6,
    layoutY: 2,
    sortOrder: 7,
    dataSource: dataSource('kommoLeads'),
    filters: {
      operator: 'AND',
      conditions: [
        { field: 'createdAt', operator: 'GREATER', value: '{{startOfDay}}' },
      ],
    },
    config: null,
  },
  {
    id: CARD_IDS.totalResolvidas,
    title: 'Total Resolvidas',
    layoutX: 9,
    layoutY: 2,
    sortOrder: 8,
    dataSource: dataSource('kommoConversations', {
      metricKey: 'total_resolved_alltime',
    }),
    filters: null,
    config: config({ subtitle: 'Desde o inicio' }),
  },
] as const;

// ---------------------------------------------------------------------------
// Global filter — MVP only seeds Period. Pipeline filter is Sprint 5 scope.
// ---------------------------------------------------------------------------

const PERIOD_FILTER: Prisma.DashboardFilterUncheckedCreateInput = {
  id: PERIOD_FILTER_ID,
  dashboardId: DASHBOARD_ID,
  field: 'dateRange',
  operator: 'BETWEEN',
  value: ['{{startOfDay}}', '{{endOfDay}}'] as Prisma.InputJsonValue,
  label: 'Periodo',
};

// ---------------------------------------------------------------------------
// Exported seed function — consumed by the orchestration seed
// (`seed-reference-data.ts`) after workspace + admin user are available.
// ---------------------------------------------------------------------------

export async function seedKommoAnalyticsComercial(
  prisma: PrismaClient,
  workspaceId: string,
  ownerUserId: string,
): Promise<void> {
  logger.log(
    `Seeding "Analytics Comercial" dashboard (workspaceId=${workspaceId}, ownerUserId=${ownerUserId})`,
  );

  await prisma.$transaction(async (tx) => {
    // 1) Dashboard --------------------------------------------------------
    const dashboardCreate: Prisma.DashboardUncheckedCreateInput = {
      id: DASHBOARD_ID,
      workspaceId,
      ownerId: ownerUserId,
      name: 'Analytics Comercial',
      description:
        'Visao em tempo-quase-real da operacao comercial no Kommo — conversas, mensagens, leads e resolucao.',
      isPublic: true,
      autoRefreshSeconds: 30,
      sortOrder: 0,
      deletedAt: null,
    };

    const dashboardUpdate: Prisma.DashboardUncheckedUpdateInput = {
      workspaceId,
      ownerId: ownerUserId,
      name: dashboardCreate.name,
      description: dashboardCreate.description,
      isPublic: dashboardCreate.isPublic,
      autoRefreshSeconds: dashboardCreate.autoRefreshSeconds,
      sortOrder: dashboardCreate.sortOrder,
      deletedAt: null,
    };

    await tx.dashboard.upsert({
      where: { id: DASHBOARD_ID },
      create: dashboardCreate,
      update: dashboardUpdate,
    });
    logger.log(`  Dashboard upserted (id=${DASHBOARD_ID})`);

    // 2) 8 Cards ----------------------------------------------------------
    for (const spec of CARD_SPECS) {
      const cardCreate: Prisma.DashboardCardUncheckedCreateInput = {
        id: spec.id,
        dashboardId: DASHBOARD_ID,
        type: CardType.KPI_NUMBER,
        title: spec.title,
        dataSource: spec.dataSource,
        filters: spec.filters ?? Prisma.JsonNull,
        axisConfig: Prisma.JsonNull,
        layoutX: spec.layoutX,
        layoutY: spec.layoutY,
        layoutW: CARD_W,
        layoutH: CARD_H,
        config: spec.config ?? Prisma.JsonNull,
        sortOrder: spec.sortOrder,
        schemaVersion: SCHEMA_VERSION,
      };

      const cardUpdate: Prisma.DashboardCardUncheckedUpdateInput = {
        dashboardId: DASHBOARD_ID,
        type: CardType.KPI_NUMBER,
        title: spec.title,
        dataSource: spec.dataSource,
        filters: spec.filters ?? Prisma.JsonNull,
        axisConfig: Prisma.JsonNull,
        layoutX: spec.layoutX,
        layoutY: spec.layoutY,
        layoutW: CARD_W,
        layoutH: CARD_H,
        config: spec.config ?? Prisma.JsonNull,
        sortOrder: spec.sortOrder,
        schemaVersion: SCHEMA_VERSION,
      };

      await tx.dashboardCard.upsert({
        where: { id: spec.id },
        create: cardCreate,
        update: cardUpdate,
      });
    }
    logger.log(`  ${CARD_SPECS.length} MVP cards upserted`);

    // 3) Global Period filter --------------------------------------------
    await tx.dashboardFilter.upsert({
      where: { id: PERIOD_FILTER_ID },
      create: PERIOD_FILTER,
      update: {
        dashboardId: PERIOD_FILTER.dashboardId,
        field: PERIOD_FILTER.field,
        operator: PERIOD_FILTER.operator,
        value: PERIOD_FILTER.value,
        label: PERIOD_FILTER.label,
      },
    });
    logger.log('  Period global filter upserted');
  });

  logger.log('Kommo "Analytics Comercial" seed complete.');
}

// ---------------------------------------------------------------------------
// Integration handshake (do NOT auto-execute here):
//
// `prisma/seed-reference-data.ts` must, AFTER seeding workspaces + admin user:
//
//   import { seedKommoAnalyticsComercial } from './seeds/kommo-analytics-comercial.seed';
//   await seedKommoAnalyticsComercial(prisma, workspace.id, admin.id);
//
// That wiring is intentionally left out of this file. It will be performed
// by Hugo Monteiro during Sprint 4 integration, together with the cross-tenant
// 404 E2E that validates `workspaceId` isolation on this seeded dashboard.
// ---------------------------------------------------------------------------
