import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

// Statuses that represent a "sold" order (faturado or beyond)
const SOLD_STATUSES = [
  'FATURAR',
  'FATURADO',
  'PRODUZIR',
  'EM_PRODUCAO',
  'PRODUZIDO',
  'ENTREGUE',
] as const;
const SOLD_STATUSES_SQL = SOLD_STATUSES.map((s) => `'${s}'`).join(',');

// Whitelist for date_trunc — prevents SQL injection even if caller is compromised
const TRUNC_WHITELIST: Record<string, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
};

type DateRange = { dateFrom?: Date; dateTo?: Date };
type BaseFilters = DateRange & { companyId?: string };

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private safeTrunc(truncExpr: string): string {
    const safe = TRUNC_WHITELIST[truncExpr];
    if (!safe) throw new Error(`Invalid truncExpr: "${truncExpr}"`);
    return safe;
  }

  // Order direto, AR via order|client, AP via supplier — workspaceId obrigatório.
  private orderWhere(
    workspaceId: string,
    filters: BaseFilters & { clientId?: string },
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      workspaceId,
      deletedAt: null,
      status: { in: [...SOLD_STATUSES] },
    };
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    return where;
  }

  private arWhere(
    workspaceId: string,
    filters: BaseFilters,
  ): Prisma.AccountReceivableWhereInput {
    const where: Prisma.AccountReceivableWhereInput = {
      OR: [{ order: { workspaceId } }, { client: { workspaceId } }],
      deletedAt: null,
      status: { not: 'CANCELLED' },
    };
    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    return where;
  }

  private apWhere(
    workspaceId: string,
    filters: BaseFilters,
  ): Prisma.AccountPayableWhereInput {
    const where: Prisma.AccountPayableWhereInput = {
      supplier: { workspaceId },
      deletedAt: null,
      status: { not: 'CANCELLED' },
    };
    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    return where;
  }

  // ---------------------------------------------------------------------------
  // KPI Summary
  // ---------------------------------------------------------------------------

  async kpiRevenue(workspaceId: string, filters: BaseFilters) {
    return this.prisma.order.aggregate({
      where: this.orderWhere(workspaceId, filters),
      _sum: { totalCents: true },
      _count: true,
    });
  }

  async kpiExpenses(workspaceId: string, filters: BaseFilters) {
    return this.prisma.accountPayable.aggregate({
      where: {
        ...this.apWhere(workspaceId, filters),
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { paidAmountCents: true },
    });
  }

  async kpiOverdueReceivables(workspaceId: string, now: Date) {
    return this.prisma.accountReceivable.aggregate({
      where: {
        OR: [{ order: { workspaceId } }, { client: { workspaceId } }],
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
    });
  }

  async kpiOverduePayables(workspaceId: string, now: Date) {
    return this.prisma.accountPayable.aggregate({
      where: {
        supplier: { workspaceId },
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Sales Chart — group orders by period
  // ---------------------------------------------------------------------------

  async salesByPeriod(
    workspaceId: string,
    filters: BaseFilters,
    truncExpr: string,
  ): Promise<{ period: string; totalCents: bigint; orderCount: bigint }[]> {
    const trunc = this.safeTrunc(truncExpr);
    const conditions: string[] = [
      `workspace_id = $1`,
      `deleted_at IS NULL`,
      `status IN (${SOLD_STATUSES_SQL})`,
    ];
    const params: unknown[] = [workspaceId];
    let idx = 2;

    if (filters.companyId) {
      conditions.push(`company_id = $${idx++}`);
      params.push(filters.companyId);
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT
        to_char(date_trunc('${trunc}', created_at), 'YYYY-MM-DD') AS period,
        COALESCE(SUM(total_cents), 0) AS "totalCents",
        COUNT(*) AS "orderCount"
      FROM orders
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY 1
    `;

    return this.prisma.$queryRawUnsafe(query, ...params);
  }

  // ---------------------------------------------------------------------------
  // Cashflow — AR (inflows) and AP (outflows) grouped by period
  // ---------------------------------------------------------------------------

  async cashflowInflows(
    workspaceId: string,
    filters: BaseFilters,
    truncExpr: string,
  ): Promise<{ period: string; totalCents: bigint }[]> {
    const trunc = this.safeTrunc(truncExpr);
    // SCOPE: AR via order.workspace_id OR client.workspace_id
    const conditions: string[] = [
      `ar.deleted_at IS NULL`,
      `ar.status != 'CANCELLED'`,
      `(o.workspace_id = $1 OR c.workspace_id = $1)`,
    ];
    const params: unknown[] = [workspaceId];
    let idx = 2;

    if (filters.dateFrom) {
      conditions.push(`ar.due_date >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`ar.due_date <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    return this.prisma.$queryRawUnsafe(
      `
      SELECT
        to_char(date_trunc('${trunc}', ar.due_date), 'YYYY-MM-DD') AS period,
        COALESCE(SUM(ar.amount_cents), 0) AS "totalCents"
      FROM accounts_receivable ar
      LEFT JOIN orders o ON o.id = ar.order_id
      LEFT JOIN clients c ON c.id = ar.client_id
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY 1
    `,
      ...params,
    );
  }

  async cashflowOutflows(
    workspaceId: string,
    filters: BaseFilters,
    truncExpr: string,
  ): Promise<{ period: string; totalCents: bigint }[]> {
    const trunc = this.safeTrunc(truncExpr);
    // SCOPE: AP via supplier.workspace_id
    const conditions: string[] = [
      `ap.deleted_at IS NULL`,
      `ap.status != 'CANCELLED'`,
      `s.workspace_id = $1`,
    ];
    const params: unknown[] = [workspaceId];
    let idx = 2;

    if (filters.dateFrom) {
      conditions.push(`ap.due_date >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`ap.due_date <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    return this.prisma.$queryRawUnsafe(
      `
      SELECT
        to_char(date_trunc('${trunc}', ap.due_date), 'YYYY-MM-DD') AS period,
        COALESCE(SUM(ap.amount_cents), 0) AS "totalCents"
      FROM accounts_payable ap
      INNER JOIN suppliers s ON s.id = ap.supplier_id
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY 1
    `,
      ...params,
    );
  }

  // ---------------------------------------------------------------------------
  // DRE
  // ---------------------------------------------------------------------------

  async dreGrossRevenue(workspaceId: string, filters: BaseFilters) {
    return this.prisma.order.aggregate({
      where: this.orderWhere(workspaceId, filters),
      _sum: { subtotalCents: true, freightCents: true },
    });
  }

  async dreDiscounts(workspaceId: string, filters: BaseFilters) {
    return this.prisma.order.aggregate({
      where: this.orderWhere(workspaceId, filters),
      _sum: { discountCents: true },
    });
  }

  async dreCancellations(workspaceId: string, filters: BaseFilters) {
    const where: Prisma.OrderWhereInput = {
      workspaceId,
      deletedAt: null,
      status: 'CANCELADO',
    };
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    return this.prisma.order.aggregate({
      where,
      _sum: { totalCents: true },
    });
  }

  async dreCogs(workspaceId: string, filters: BaseFilters) {
    // COGS = AP linked to purchase orders (cost of goods).
    // SCOPE: AP via supplier.workspaceId.
    const where: Prisma.AccountPayableWhereInput = {
      supplier: { workspaceId },
      deletedAt: null,
      status: { not: 'CANCELLED' },
      purchaseOrderId: { not: null },
    };
    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    return this.prisma.accountPayable.aggregate({
      where,
      _sum: { amountCents: true },
    });
  }

  async dreOperatingExpensesByCategory(
    workspaceId: string,
    filters: BaseFilters,
  ): Promise<{ name: string; amountCents: bigint }[]> {
    // SCOPE: AP via supplier.workspace_id (JOIN explicito).
    const conditions: string[] = [
      `ap.deleted_at IS NULL`,
      `ap.status != 'CANCELLED'`,
      `ap.purchase_order_id IS NULL`, // exclude COGS
      `fc.type = 'DESPESA'`,
      `s.workspace_id = $1`,
    ];
    const params: unknown[] = [workspaceId];
    let idx = 2;

    if (filters.dateFrom) {
      conditions.push(`ap.due_date >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`ap.due_date <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    return this.prisma.$queryRawUnsafe(
      `
      SELECT
        COALESCE(fc.name, 'Sem categoria') AS name,
        COALESCE(SUM(ap.amount_cents), 0) AS "amountCents"
      FROM accounts_payable ap
      INNER JOIN suppliers s ON s.id = ap.supplier_id
      LEFT JOIN financial_categories fc ON fc.id = ap.category_id
      WHERE ${whereClause}
      GROUP BY fc.name
      ORDER BY "amountCents" DESC
    `,
      ...params,
    );
  }

  async dreOperatingExpensesTotal(workspaceId: string, filters: BaseFilters) {
    const where: Prisma.AccountPayableWhereInput = {
      supplier: { workspaceId },
      deletedAt: null,
      status: { not: 'CANCELLED' },
      purchaseOrderId: null, // exclude COGS
      category: { type: 'DESPESA' },
    };
    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    return this.prisma.accountPayable.aggregate({
      where,
      _sum: { amountCents: true },
    });
  }

  // ---------------------------------------------------------------------------
  // Sales Report — paginated
  // ---------------------------------------------------------------------------

  async salesReportItems(
    workspaceId: string,
    filters: BaseFilters & { clientId?: string },
    skip: number,
    take: number,
  ) {
    const where = this.orderWhere(workspaceId, filters);
    const [items, total, grandTotalAgg] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          title: true,
          status: true,
          totalCents: true,
          discountCents: true,
          freightCents: true,
          paidAmountCents: true,
          createdAt: true,
          issueDate: true,
          client: { select: { name: true } },
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: { totalCents: true },
      }),
    ]);
    return {
      items,
      total,
      grandTotalCents: grandTotalAgg._sum.totalCents ?? 0,
    };
  }
}
