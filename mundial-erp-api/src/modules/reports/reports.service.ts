import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import {
  ReportFiltersDto,
  SalesChartFiltersDto,
  CashflowFiltersDto,
  SalesReportFiltersDto,
} from './dto';
import { KpiSummaryResponseDto } from './dto/kpi-summary-response.dto';
import {
  SalesChartResponseDto,
  SalesChartPointDto,
} from './dto/sales-chart-response.dto';
import {
  CashflowResponseDto,
  CashflowPeriodDto,
} from './dto/cashflow-response.dto';
import { DreResponseDto, DreCategoryLineDto } from './dto/dre-response.dto';
import {
  SalesReportResponseDto,
  SalesReportItemDto,
} from './dto/sales-report-response.dto';

const VALID_GROUP_BY = new Set(['day', 'week', 'month']);

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly repository: ReportsRepository) {}

  // ---------------------------------------------------------------------------
  // KPI Summary
  // ---------------------------------------------------------------------------

  async getKpiSummary(
    workspaceId: string,
    filters: ReportFiltersDto,
  ): Promise<KpiSummaryResponseDto> {
    this.logger.log('Generating KPI summary report');
    const now = new Date();

    const [revenueAgg, expensesAgg, overdueAR, overdueAP] = await Promise.all([
      this.repository.kpiRevenue(workspaceId, filters),
      this.repository.kpiExpenses(workspaceId, filters),
      this.repository.kpiOverdueReceivables(workspaceId, now),
      this.repository.kpiOverduePayables(workspaceId, now),
    ]);

    const totalRevenueCents = revenueAgg._sum.totalCents ?? 0;
    const totalExpensesCents = expensesAgg._sum.paidAmountCents ?? 0;
    const orderCount = revenueAgg._count;

    const dto = new KpiSummaryResponseDto();
    dto.totalRevenueCents = totalRevenueCents;
    dto.totalExpensesCents = totalExpensesCents;
    dto.grossMarginCents = totalRevenueCents - totalExpensesCents;
    dto.grossMarginPercent =
      totalRevenueCents > 0
        ? Math.round(
            ((totalRevenueCents - totalExpensesCents) / totalRevenueCents) *
              10000,
          ) / 100
        : 0;
    dto.orderCount = orderCount;
    dto.averageTicketCents =
      orderCount > 0 ? Math.round(totalRevenueCents / orderCount) : 0;
    dto.overdueReceivableCents = overdueAR._sum.amountCents ?? 0;
    dto.overduePayableCents = overdueAP._sum.amountCents ?? 0;

    return dto;
  }

  // ---------------------------------------------------------------------------
  // Sales Chart
  // ---------------------------------------------------------------------------

  async getSalesChart(
    workspaceId: string,
    filters: SalesChartFiltersDto,
  ): Promise<SalesChartResponseDto> {
    this.logger.log(
      `Generating sales chart report (groupBy=${filters.groupBy})`,
    );
    const truncExpr = this.resolveGroupBy(filters.groupBy);
    const rows = await this.repository.salesByPeriod(
      workspaceId,
      filters,
      truncExpr,
    );

    const data: SalesChartPointDto[] = rows.map((r) => ({
      period: r.period,
      totalCents: Number(r.totalCents),
      orderCount: Number(r.orderCount),
    }));

    const totalCents = data.reduce((sum, d) => sum + d.totalCents, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);

    return { data, totalCents, totalOrders };
  }

  // ---------------------------------------------------------------------------
  // Cashflow
  // ---------------------------------------------------------------------------

  async getCashflow(
    workspaceId: string,
    filters: CashflowFiltersDto,
  ): Promise<CashflowResponseDto> {
    this.logger.log(`Generating cashflow report (groupBy=${filters.groupBy})`);
    const truncExpr = this.resolveGroupBy(filters.groupBy);

    const [inflowRows, outflowRows] = await Promise.all([
      this.repository.cashflowInflows(workspaceId, filters, truncExpr),
      this.repository.cashflowOutflows(workspaceId, filters, truncExpr),
    ]);

    // Merge both into a single timeline
    const inflowMap = new Map(
      inflowRows.map((r) => [r.period, Number(r.totalCents)]),
    );
    const outflowMap = new Map(
      outflowRows.map((r) => [r.period, Number(r.totalCents)]),
    );

    const allPeriods = [
      ...new Set([...inflowMap.keys(), ...outflowMap.keys()]),
    ].sort();

    let runningBalance = 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    const periods: CashflowPeriodDto[] = allPeriods.map((period) => {
      const inflow = inflowMap.get(period) ?? 0;
      const outflow = outflowMap.get(period) ?? 0;
      const net = inflow - outflow;
      runningBalance += net;
      totalInflow += inflow;
      totalOutflow += outflow;

      return {
        period,
        inflowCents: inflow,
        outflowCents: outflow,
        netCents: net,
        runningBalanceCents: runningBalance,
      };
    });

    return {
      periods,
      totalInflowCents: totalInflow,
      totalOutflowCents: totalOutflow,
      netBalanceCents: totalInflow - totalOutflow,
    };
  }

  // ---------------------------------------------------------------------------
  // DRE (Demonstrativo de Resultado do Exercicio)
  // ---------------------------------------------------------------------------

  async getDre(
    workspaceId: string,
    filters: ReportFiltersDto,
  ): Promise<DreResponseDto> {
    this.logger.log('Generating DRE report');
    const [
      grossAgg,
      discountAgg,
      cancellationAgg,
      cogsAgg,
      opexTotal,
      opexBreakdown,
    ] = await Promise.all([
      this.repository.dreGrossRevenue(workspaceId, filters),
      this.repository.dreDiscounts(workspaceId, filters),
      this.repository.dreCancellations(workspaceId, filters),
      this.repository.dreCogs(workspaceId, filters),
      this.repository.dreOperatingExpensesTotal(workspaceId, filters),
      this.repository.dreOperatingExpensesByCategory(workspaceId, filters),
    ]);

    // ST (Substituicao Tributaria) e repasse fiscal — nao entra na receita bruta
    const grossRevenueCents =
      (grossAgg._sum.subtotalCents ?? 0) + (grossAgg._sum.freightCents ?? 0);

    const discountsCents = discountAgg._sum.discountCents ?? 0;
    const cancellationsCents = cancellationAgg._sum.totalCents ?? 0;
    const netRevenueCents =
      grossRevenueCents - discountsCents - cancellationsCents;

    const cogsCents = cogsAgg._sum.amountCents ?? 0;
    const grossProfitCents = netRevenueCents - cogsCents;

    const operatingExpensesCents = opexTotal._sum.amountCents ?? 0;
    const operatingIncomeCents = grossProfitCents - operatingExpensesCents;

    const operatingExpensesBreakdown: DreCategoryLineDto[] = opexBreakdown.map(
      (row) => ({
        name: row.name,
        amountCents: Number(row.amountCents),
      }),
    );

    return {
      grossRevenueCents,
      discountsCents,
      cancellationsCents,
      netRevenueCents,
      cogsCents,
      grossProfitCents,
      operatingExpensesCents,
      operatingExpensesBreakdown,
      operatingIncomeCents,
      netIncomeCents: operatingIncomeCents, // simplified (no non-operating items yet)
    };
  }

  // ---------------------------------------------------------------------------
  // Sales Report (paginated)
  // ---------------------------------------------------------------------------

  async getSalesReport(
    workspaceId: string,
    filters: SalesReportFiltersDto,
  ): Promise<SalesReportResponseDto> {
    this.logger.log(`Generating sales report (page=${filters.page})`);
    const { items, total, grandTotalCents } =
      await this.repository.salesReportItems(
        workspaceId,
        filters,
        filters.skip,
        filters.limit,
      );

    const mappedItems = items.map((o) =>
      SalesReportItemDto.fromEntity(o as unknown as Record<string, unknown>),
    );
    const pageTotalCents = mappedItems.reduce(
      (sum, i) => sum + i.totalCents,
      0,
    );

    return {
      items: mappedItems,
      total,
      page: filters.page,
      limit: filters.limit,
      pageTotalCents,
      grandTotalCents,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private resolveGroupBy(groupBy: string): string {
    if (!VALID_GROUP_BY.has(groupBy)) {
      throw new BadRequestException(
        `groupBy invalido: "${groupBy}". Use: day, week, month`,
      );
    }
    return groupBy;
  }
}
