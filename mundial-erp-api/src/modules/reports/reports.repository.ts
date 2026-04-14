import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

// Statuses that represent a "sold" order (faturado or beyond)
const SOLD_STATUSES = ['FATURAR', 'FATURADO', 'PRODUZIR', 'EM_PRODUCAO', 'PRODUZIDO', 'ENTREGUE'] as const;
const SOLD_STATUSES_SQL = SOLD_STATUSES.map((s) => `'${s}'`).join(',');

// Whitelist for date_trunc — prevents SQL injection even if caller is compromised
const TRUNC_WHITELIST: Record<string, string> = { day: 'day', week: 'week', month: 'month' };

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

  private orderWhere(filters: BaseFilters & { clientId?: string }): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
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

  private arWhere(filters: BaseFilters): Prisma.AccountReceivableWhereInput {
    const where: Prisma.AccountReceivableWhereInput = {
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

  private apWhere(filters: BaseFilters): Prisma.AccountPayableWhereInput {
    const where: Prisma.AccountPayableWhereInput = {
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

  async kpiRevenue(filters: BaseFilters) {
    return this.prisma.order.aggregate({
      where: this.orderWhere(filters),
      _sum: { totalCents: true },
      _count: true,
    });
  }

  async kpiExpenses(filters: BaseFilters) {
    return this.prisma.accountPayable.aggregate({
      where: {
        ...this.apWhere(filters),
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { paidAmountCents: true },
    });
  }

  async kpiOverdueReceivables(now: Date) {
    return this.prisma.accountReceivable.aggregate({
      where: {
        deletedAt: null,
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      _sum: { amountCents: true },
    });
  }

  async kpiOverduePayables(now: Date) {
    return this.prisma.accountPayable.aggregate({
      where: {
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

  async salesByPeriod(filters: BaseFilters, truncExpr: string): Promise<{ period: string; totalCents: bigint; orderCount: bigint }[]> {
    const trunc = this.safeTrunc(truncExpr);
    const conditions: string[] = [
      `deleted_at IS NULL`,
      `status IN (${SOLD_STATUSES_SQL})`,
    ];
    const params: unknown[] = [];
    let idx = 1;

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

  async cashflowInflows(filters: BaseFilters, truncExpr: string): Promise<{ period: string; totalCents: bigint }[]> {
    const trunc = this.safeTrunc(truncExpr);
    const conditions: string[] = [
      `deleted_at IS NULL`,
      `status != 'CANCELLED'`,
    ];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.dateFrom) {
      conditions.push(`due_date >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`due_date <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    return this.prisma.$queryRawUnsafe(`
      SELECT
        to_char(date_trunc('${trunc}', due_date), 'YYYY-MM-DD') AS period,
        COALESCE(SUM(amount_cents), 0) AS "totalCents"
      FROM accounts_receivable
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY 1
    `, ...params);
  }

  async cashflowOutflows(filters: BaseFilters, truncExpr: string): Promise<{ period: string; totalCents: bigint }[]> {
    const trunc = this.safeTrunc(truncExpr);
    const conditions: string[] = [
      `deleted_at IS NULL`,
      `status != 'CANCELLED'`,
    ];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.dateFrom) {
      conditions.push(`due_date >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`due_date <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    return this.prisma.$queryRawUnsafe(`
      SELECT
        to_char(date_trunc('${trunc}', due_date), 'YYYY-MM-DD') AS period,
        COALESCE(SUM(amount_cents), 0) AS "totalCents"
      FROM accounts_payable
      WHERE ${whereClause}
      GROUP BY 1
      ORDER BY 1
    `, ...params);
  }

  // ---------------------------------------------------------------------------
  // DRE
  // ---------------------------------------------------------------------------

  async dreGrossRevenue(filters: BaseFilters) {
    return this.prisma.order.aggregate({
      where: this.orderWhere(filters),
      _sum: { subtotalCents: true, freightCents: true },
    });
  }

  async dreDiscounts(filters: BaseFilters) {
    return this.prisma.order.aggregate({
      where: this.orderWhere(filters),
      _sum: { discountCents: true },
    });
  }

  async dreCancellations(filters: BaseFilters) {
    const where: Prisma.OrderWhereInput = {
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

  async dreCogs(filters: BaseFilters) {
    // COGS = AP linked to purchase orders (cost of goods)
    const where: Prisma.AccountPayableWhereInput = {
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

  async dreOperatingExpensesByCategory(filters: BaseFilters): Promise<{ name: string; amountCents: bigint }[]> {
    const conditions: string[] = [
      `ap.deleted_at IS NULL`,
      `ap.status != 'CANCELLED'`,
      `ap.purchase_order_id IS NULL`, // exclude COGS
      `fc.type = 'DESPESA'`,
    ];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.dateFrom) {
      conditions.push(`ap.due_date >= $${idx++}`);
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`ap.due_date <= $${idx++}`);
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');
    return this.prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(fc.name, 'Sem categoria') AS name,
        COALESCE(SUM(ap.amount_cents), 0) AS "amountCents"
      FROM accounts_payable ap
      LEFT JOIN financial_categories fc ON fc.id = ap.category_id
      WHERE ${whereClause}
      GROUP BY fc.name
      ORDER BY "amountCents" DESC
    `, ...params);
  }

  async dreOperatingExpensesTotal(filters: BaseFilters) {
    const where: Prisma.AccountPayableWhereInput = {
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

  async salesReportItems(filters: BaseFilters & { clientId?: string }, skip: number, take: number) {
    const where = this.orderWhere(filters);
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
    return { items, total, grandTotalCents: grandTotalAgg._sum.totalCents ?? 0 };
  }
}
