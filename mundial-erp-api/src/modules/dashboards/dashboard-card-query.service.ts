import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CardType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  EMPTY_INTERSECTION,
  mergeFilters,
  type EmptyIntersection,
  type MergedWhere,
} from './utils/merge-filters';

/**
 * Heart of the Dashboards module — PLANO 2.6d.
 * Translates a card's dataSource + filters into Prisma queries
 * and returns data in the format expected by each CardType.
 *
 * NOTE: This service accesses Prisma directly (not via Repository) because
 * it queries dynamically across 7+ entities. A single repository can't own
 * all delegates. Field access is restricted via ALLOWED_FIELDS allowlist
 * to prevent filter injection.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataSource = {
  entity: string;
  processId?: string;
  departmentId?: string;
  statusFilter?: string;
  dateRange?: string;
};

export type AxisConfig = {
  xField?: string;
  yField?: string;
  groupBy?: string;
};

export type GlobalFilter = {
  field: string;
  operator: string;
  value: unknown;
};

type LabelValue = { label: string; value: number };
type XYPoint = { x: string; y: number };
type TableData = { columns: string[]; rows: Record<string, unknown>[] };
type KpiData = { value: number; label: string };

export type CardDataResult = LabelValue[] | XYPoint[] | TableData | KpiData;

// ---------------------------------------------------------------------------
// Security: field allowlists per entity
// ---------------------------------------------------------------------------

const SUPPORTED_ENTITIES = [
  'orders',
  'accounts_receivable',
  'accounts_payable',
  'products',
  'production_orders',
  'invoices',
  'clients',
] as const;
type SupportedEntity = (typeof SUPPORTED_ENTITIES)[number];

const ALLOWED_FIELDS: Record<SupportedEntity, Set<string>> = {
  orders: new Set([
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
  ]),
  accounts_receivable: new Set([
    'status',
    'clientId',
    'dueDate',
    'amountCents',
    'categoryId',
    'createdAt',
  ]),
  accounts_payable: new Set([
    'status',
    'supplierId',
    'dueDate',
    'amountCents',
    'categoryId',
    'createdAt',
  ]),
  products: new Set([
    'departmentId',
    'typeId',
    'brandId',
    'isActive',
    'createdAt',
    'name',
  ]),
  production_orders: new Set(['status', 'orderId', 'createdAt']),
  invoices: new Set([
    'status',
    'orderId',
    'issuedAt',
    'totalCents',
    'createdAt',
  ]),
  clients: new Set([
    'classificationId',
    'isActive',
    'createdAt',
    'city',
    'state',
  ]),
};

const ALLOWED_VALUE_FIELDS: Record<SupportedEntity, Set<string>> = {
  orders: new Set([
    'totalCents',
    'subtotalCents',
    'freightCents',
    'discountCents',
    'paidAmountCents',
    'id',
  ]),
  accounts_receivable: new Set(['amountCents', 'paidAmountCents', 'id']),
  accounts_payable: new Set(['amountCents', 'paidAmountCents', 'id']),
  products: new Set(['priceCents', 'costCents', 'stockQuantity', 'id']),
  production_orders: new Set(['id']),
  invoices: new Set(['totalCents', 'id']),
  clients: new Set(['id']),
};

const ALLOWED_GROUP_FIELDS: Record<SupportedEntity, Set<string>> = {
  orders: new Set([
    'status',
    'clientId',
    'companyId',
    'createdByUserId',
    'orderTypeId',
    'isResale',
  ]),
  accounts_receivable: new Set(['status', 'clientId', 'categoryId']),
  accounts_payable: new Set(['status', 'supplierId', 'categoryId']),
  products: new Set(['departmentId', 'typeId', 'brandId', 'isActive']),
  production_orders: new Set(['status']),
  invoices: new Set(['status']),
  clients: new Set(['classificationId', 'state', 'city', 'isActive']),
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DashboardCardQueryService {
  private readonly logger = new Logger(DashboardCardQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    cardType: CardType,
    dataSource: DataSource,
    axisConfig: AxisConfig | null,
    cardFilters: Record<string, unknown> | null,
    globalFilters: GlobalFilter[],
  ): Promise<CardDataResult> {
    const entity = this.normalizeEntity(dataSource.entity);
    const built = this.buildWhere(
      entity,
      dataSource,
      cardFilters,
      globalFilters,
    );

    if (built === EMPTY_INTERSECTION) {
      return this.emptyResultFor(cardType, entity);
    }

    switch (cardType) {
      case 'KPI_NUMBER':
        return this.executeKpi(entity, built, axisConfig);
      case 'TABLE':
        return this.executeTable(entity, built);
      case 'PIE_CHART':
      case 'DONUT':
      case 'BAR_CHART':
      case 'STACKED_BAR':
        return this.executeGrouped(entity, built, axisConfig);
      case 'LINE_CHART':
      case 'AREA_CHART':
        return this.executeTimeSeries(entity, built, axisConfig);
      default:
        throw new BadRequestException(
          `Tipo de card nao suportado: ${cardType}`,
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Empty-result shapes (ADR-008)
  // ---------------------------------------------------------------------------

  /**
   * Quando o merge de filtros detecta interseccao vazia (card x global com
   * mesmo field incompativel), retornamos o shape "vazio" correspondente ao
   * CardType, sem tocar o Prisma. ADR-008 secao 2.
   */
  private emptyResultFor(
    cardType: CardType,
    entity: SupportedEntity,
  ): CardDataResult {
    switch (cardType) {
      case 'KPI_NUMBER':
        return { value: 0, label: 'Total' };
      case 'TABLE': {
        const columns = ['id', ...Array.from(ALLOWED_FIELDS[entity])];
        return { columns, rows: [] };
      }
      case 'PIE_CHART':
      case 'DONUT':
      case 'BAR_CHART':
      case 'STACKED_BAR':
        return [] as LabelValue[];
      case 'LINE_CHART':
      case 'AREA_CHART':
        return [] as XYPoint[];
      default:
        throw new BadRequestException(
          `Tipo de card nao suportado: ${cardType}`,
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Entity normalization
  // ---------------------------------------------------------------------------

  private normalizeEntity(raw: string): SupportedEntity {
    const map: Record<string, SupportedEntity> = {
      orders: 'orders',
      order: 'orders',
      accounts_receivable: 'accounts_receivable',
      ar: 'accounts_receivable',
      accounts_payable: 'accounts_payable',
      ap: 'accounts_payable',
      products: 'products',
      product: 'products',
      production_orders: 'production_orders',
      production: 'production_orders',
      invoices: 'invoices',
      invoice: 'invoices',
      clients: 'clients',
      client: 'clients',
    };
    const normalized = map[raw.toLowerCase()];
    if (!normalized) {
      throw new BadRequestException(
        `Entidade "${raw}" nao suportada. Use: ${SUPPORTED_ENTITIES.join(', ')}`,
      );
    }
    return normalized;
  }

  // ---------------------------------------------------------------------------
  // WHERE builder (with field allowlist)
  // ---------------------------------------------------------------------------

  private buildWhere(
    entity: SupportedEntity,
    dataSource: DataSource,
    cardFilters: Record<string, unknown> | null,
    globalFilters: GlobalFilter[],
  ): Record<string, unknown> | EmptyIntersection {
    const allowed = ALLOWED_FIELDS[entity];

    // Validar operators antecipadamente (mantem contrato da whitelist de
    // operators — T-T4). Se algum operator e invalido, aborta com 400 antes
    // de chegar ao helper de merge.
    for (const gf of globalFilters) {
      if (allowed.has(gf.field)) {
        this.assertOperatorAllowed(gf.operator);
      }
    }

    // INTERSECAO (ADR-008): nunca substitui — card x global sempre restringe.
    // `workspaceId` NAO entra aqui; e aplicado depois, como primeira clausula.
    const merged = mergeFilters(cardFilters ?? {}, globalFilters, allowed);
    if (merged === EMPTY_INTERSECTION) {
      return EMPTY_INTERSECTION;
    }

    // Clausulas intrinsecas aplicadas DEPOIS do merge — soft-delete guard e
    // clausulas de dataSource nao podem ser sobrescritas via cardFilters ou
    // globalFilters (o merge ja opera apenas sobre `allowed`, que nao inclui
    // `deletedAt`; esta ordem garante a invariante mesmo contra futuras
    // adicoes a whitelist).
    const where: MergedWhere = { ...merged, deletedAt: null };

    if (dataSource.statusFilter && allowed.has('status')) {
      where.status = dataSource.statusFilter;
    }

    if (dataSource.dateRange) {
      const dateField = this.getDateField(entity);
      where[dateField] = { gte: this.resolveDateRange(dataSource.dateRange) };
    }

    if (dataSource.departmentId) {
      if (entity === 'products' && allowed.has('departmentId')) {
        where.departmentId = dataSource.departmentId;
      }
    }

    return where;
  }

  /**
   * Valida operator contra a whitelist. Mantem paridade com
   * `operatorToPrisma` (unica fonte da verdade) mas sem converter — usado
   * para validacao antecipada antes do merge. Unsupported => 400.
   */
  private assertOperatorAllowed(operator: string): void {
    switch (operator) {
      case 'EQUALS':
      case 'NOT_EQUALS':
      case 'GREATER':
      case 'LESS':
      case 'BETWEEN':
      case 'IN':
        return;
      default:
        this.logger.warn(
          { operator, context: 'assertOperatorAllowed' },
          'Unsupported operator rejected',
        );
        throw new BadRequestException(
          `Unsupported operator: ${operator}. Allowed: EQUALS, NOT_EQUALS, GREATER, LESS, BETWEEN, IN`,
        );
    }
  }

  private getDateField(entity: SupportedEntity): string {
    const map: Record<SupportedEntity, string> = {
      orders: 'createdAt',
      accounts_receivable: 'dueDate',
      accounts_payable: 'dueDate',
      invoices: 'issuedAt',
      production_orders: 'createdAt',
      products: 'createdAt',
      clients: 'createdAt',
    };
    return map[entity];
  }

  private resolveDateRange(range: string): Date {
    const now = new Date();
    const ms = (days: number) => new Date(now.getTime() - days * 86_400_000);
    switch (range) {
      case 'last_7d':
        return ms(7);
      case 'last_30d':
        return ms(30);
      case 'last_90d':
        return ms(90);
      case 'last_365d':
        return ms(365);
      case 'this_month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'this_year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return ms(30);
    }
  }

  // NOTE: `operatorToPrisma` foi removido em ADR-008 — traducao operator->Prisma
  // agora vive em `utils/merge-filters.ts` (unica fonte da verdade). Validacao
  // de operator permanece em `assertOperatorAllowed` (acima).

  // ---------------------------------------------------------------------------
  // Prisma delegate resolver
  // ---------------------------------------------------------------------------

  private getDelegate(entity: SupportedEntity): any {
    const map = {
      orders: this.prisma.order,
      accounts_receivable: this.prisma.accountReceivable,
      accounts_payable: this.prisma.accountPayable,
      products: this.prisma.product,
      production_orders: this.prisma.productionOrder,
      invoices: this.prisma.invoice,
      clients: this.prisma.client,
    };
    return map[entity];
  }

  private getDefaultValueField(entity: SupportedEntity): string {
    const map: Record<SupportedEntity, string> = {
      orders: 'totalCents',
      accounts_receivable: 'amountCents',
      accounts_payable: 'amountCents',
      invoices: 'totalCents',
      production_orders: 'id',
      products: 'id',
      clients: 'id',
    };
    return map[entity];
  }

  private resolveValueField(
    entity: SupportedEntity,
    axisConfig: AxisConfig | null,
  ): string {
    const field = axisConfig?.yField ?? this.getDefaultValueField(entity);
    if (!ALLOWED_VALUE_FIELDS[entity].has(field)) {
      throw new BadRequestException(
        `Campo "${field}" nao permitido como valor para ${entity}`,
      );
    }
    return field;
  }

  private resolveGroupField(
    entity: SupportedEntity,
    axisConfig: AxisConfig | null,
  ): string {
    const field = axisConfig?.groupBy ?? axisConfig?.xField ?? 'status';
    if (!ALLOWED_GROUP_FIELDS[entity].has(field)) {
      throw new BadRequestException(
        `Campo "${field}" nao permitido como agrupamento para ${entity}`,
      );
    }
    return field;
  }

  // ---------------------------------------------------------------------------
  // Query executors per CardType
  // ---------------------------------------------------------------------------

  private async executeKpi(
    entity: SupportedEntity,
    where: Record<string, unknown>,
    axisConfig: AxisConfig | null,
  ): Promise<KpiData> {
    const delegate = this.getDelegate(entity);
    const valueField = this.resolveValueField(entity, axisConfig);

    if (valueField === 'id') {
      const count: number = await delegate.count({ where });
      return { value: count, label: 'Total' };
    }

    const agg = await delegate.aggregate({
      where,
      _sum: { [valueField]: true },
    });

    return {
      value: (agg._sum?.[valueField] as number) ?? 0,
      label: 'Total',
    };
  }

  private async executeTable(
    entity: SupportedEntity,
    where: Record<string, unknown>,
  ): Promise<TableData> {
    // Invariant: never return fields outside ALLOWED_FIELDS[entity] (+ id) — prevents leaking workspaceId/deletedAt/tokens/etc.
    const delegate = this.getDelegate(entity);
    const allowedColumns = ['id', ...Array.from(ALLOWED_FIELDS[entity])];
    const select = Object.fromEntries(allowedColumns.map((c) => [c, true]));

    const rows = await delegate.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
      select,
    });

    if (rows.length === 0) {
      return { columns: [], rows: [] };
    }

    return {
      columns: allowedColumns,
      rows: rows as Record<string, unknown>[],
    };
  }

  private async executeGrouped(
    entity: SupportedEntity,
    where: Record<string, unknown>,
    axisConfig: AxisConfig | null,
  ): Promise<LabelValue[]> {
    const delegate = this.getDelegate(entity);
    const groupField = this.resolveGroupField(entity, axisConfig);
    const valueField = this.resolveValueField(entity, axisConfig);
    const isCountBased = valueField === 'id';

    const grouped = await delegate.groupBy({
      by: [groupField],
      where,
      ...(isCountBased ? { _count: true } : { _sum: { [valueField]: true } }),
      orderBy: { [groupField]: 'asc' },
    });

    return (grouped as Record<string, unknown>[]).map((g) => ({
      label: String(g[groupField] ?? 'N/A'),
      value: isCountBased
        ? (g._count as number)
        : ((g._sum as Record<string, number>)?.[valueField] ?? 0),
    }));
  }

  private async executeTimeSeries(
    entity: SupportedEntity,
    where: Record<string, unknown>,
    axisConfig: AxisConfig | null,
  ): Promise<XYPoint[]> {
    const delegate = this.getDelegate(entity);
    const dateField = axisConfig?.xField ?? this.getDateField(entity);
    const valueField = this.resolveValueField(entity, axisConfig);
    const isCountBased = valueField === 'id';

    // Use groupBy with date field for DB-level aggregation (limited to 366 buckets max)
    // For time-series we fetch records with select and aggregate in memory with a cap
    const records = await delegate.findMany({
      where,
      select: {
        [dateField]: true,
        ...(isCountBased ? {} : { [valueField]: true }),
      },
      orderBy: { [dateField]: 'asc' },
      take: 5000,
    });

    const buckets = new Map<string, number>();
    for (const rec of records as Record<string, unknown>[]) {
      const d = rec[dateField];
      if (!d) continue;
      const key = new Date(d as string | number).toISOString().slice(0, 10);
      const val = isCountBased
        ? 1
        : typeof rec[valueField] === 'number'
          ? rec[valueField]
          : 1;
      buckets.set(key, (buckets.get(key) ?? 0) + val);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([x, y]) => ({ x, y }));
  }
}
