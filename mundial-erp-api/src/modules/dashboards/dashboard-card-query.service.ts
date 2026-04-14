import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CardType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

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

const SUPPORTED_ENTITIES = ['orders', 'accounts_receivable', 'accounts_payable', 'products', 'production_orders', 'invoices', 'clients'] as const;
type SupportedEntity = typeof SUPPORTED_ENTITIES[number];

const ALLOWED_FIELDS: Record<SupportedEntity, Set<string>> = {
  orders: new Set(['status', 'clientId', 'companyId', 'createdByUserId', 'assignedUserId', 'createdAt', 'totalCents', 'isResale', 'shouldProduce', 'orderTypeId']),
  accounts_receivable: new Set(['status', 'clientId', 'dueDate', 'amountCents', 'categoryId', 'createdAt']),
  accounts_payable: new Set(['status', 'supplierId', 'dueDate', 'amountCents', 'categoryId', 'createdAt']),
  products: new Set(['departmentId', 'typeId', 'brandId', 'isActive', 'createdAt', 'name']),
  production_orders: new Set(['status', 'orderId', 'createdAt']),
  invoices: new Set(['status', 'orderId', 'issuedAt', 'totalCents', 'createdAt']),
  clients: new Set(['classificationId', 'isActive', 'createdAt', 'city', 'state']),
};

const ALLOWED_VALUE_FIELDS: Record<SupportedEntity, Set<string>> = {
  orders: new Set(['totalCents', 'subtotalCents', 'freightCents', 'discountCents', 'paidAmountCents', 'id']),
  accounts_receivable: new Set(['amountCents', 'paidAmountCents', 'id']),
  accounts_payable: new Set(['amountCents', 'paidAmountCents', 'id']),
  products: new Set(['priceCents', 'costCents', 'stockQuantity', 'id']),
  production_orders: new Set(['id']),
  invoices: new Set(['totalCents', 'id']),
  clients: new Set(['id']),
};

const ALLOWED_GROUP_FIELDS: Record<SupportedEntity, Set<string>> = {
  orders: new Set(['status', 'clientId', 'companyId', 'createdByUserId', 'orderTypeId', 'isResale']),
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
    const where = this.buildWhere(entity, dataSource, cardFilters, globalFilters);

    switch (cardType) {
      case 'KPI_NUMBER':
        return this.executeKpi(entity, where, axisConfig);
      case 'TABLE':
        return this.executeTable(entity, where);
      case 'PIE_CHART':
      case 'DONUT':
      case 'BAR_CHART':
      case 'STACKED_BAR':
        return this.executeGrouped(entity, where, axisConfig);
      case 'LINE_CHART':
      case 'AREA_CHART':
        return this.executeTimeSeries(entity, where, axisConfig);
      default:
        throw new BadRequestException(`Tipo de card nao suportado: ${cardType}`);
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
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };
    const allowed = ALLOWED_FIELDS[entity];

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

    // Card-level filters — only allowed fields
    if (cardFilters) {
      for (const [key, val] of Object.entries(cardFilters)) {
        if (val !== undefined && val !== null && allowed.has(key)) {
          where[key] = val;
        }
      }
    }

    // Global dashboard filters — only allowed fields
    for (const gf of globalFilters) {
      if (allowed.has(gf.field)) {
        where[gf.field] = this.operatorToPrisma(gf.operator, gf.value);
      }
    }

    return where;
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
      case 'last_7d': return ms(7);
      case 'last_30d': return ms(30);
      case 'last_90d': return ms(90);
      case 'last_365d': return ms(365);
      case 'this_month': return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'this_year': return new Date(now.getFullYear(), 0, 1);
      default: return ms(30);
    }
  }

  private operatorToPrisma(operator: string, value: unknown): unknown {
    switch (operator) {
      case 'EQUALS': return value;
      case 'NOT_EQUALS': return { not: value };
      case 'GREATER': return { gt: value };
      case 'LESS': return { lt: value };
      case 'BETWEEN': {
        const arr = value as [unknown, unknown];
        return { gte: arr[0], lte: arr[1] };
      }
      case 'IN': return { in: Array.isArray(value) ? value : [value] };
      default: return value;
    }
  }

  // ---------------------------------------------------------------------------
  // Prisma delegate resolver
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any — dynamic delegate across 7 models
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

  private resolveValueField(entity: SupportedEntity, axisConfig: AxisConfig | null): string {
    const field = axisConfig?.yField ?? this.getDefaultValueField(entity);
    if (!ALLOWED_VALUE_FIELDS[entity].has(field)) {
      throw new BadRequestException(`Campo "${field}" nao permitido como valor para ${entity}`);
    }
    return field;
  }

  private resolveGroupField(entity: SupportedEntity, axisConfig: AxisConfig | null): string {
    const field = axisConfig?.groupBy ?? axisConfig?.xField ?? 'status';
    if (!ALLOWED_GROUP_FIELDS[entity].has(field)) {
      throw new BadRequestException(`Campo "${field}" nao permitido como agrupamento para ${entity}`);
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
    const delegate = this.getDelegate(entity);
    const rows = await delegate.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    if (rows.length === 0) {
      return { columns: [], rows: [] };
    }

    const excluded = new Set(['deletedAt', 'updatedAt']);
    const columns = Object.keys(rows[0] as Record<string, unknown>).filter(
      (k: string) => !excluded.has(k),
    );

    return { columns, rows: rows as Record<string, unknown>[] };
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
      ...(isCountBased
        ? { _count: true }
        : { _sum: { [valueField]: true } }),
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
      select: { [dateField]: true, ...(isCountBased ? {} : { [valueField]: true }) },
      orderBy: { [dateField]: 'asc' },
      take: 5000,
    });

    const buckets = new Map<string, number>();
    for (const rec of records as Record<string, unknown>[]) {
      const d = rec[dateField];
      if (!d) continue;
      const key = new Date(d as string | number).toISOString().slice(0, 10);
      const val = isCountBased ? 1 : (typeof rec[valueField] === 'number' ? (rec[valueField] as number) : 1);
      buckets.set(key, (buckets.get(key) ?? 0) + val);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([x, y]) => ({ x, y }));
  }
}
