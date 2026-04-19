import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { ReportsService } from './reports.service';
import {
  ReportFiltersDto,
  SalesChartFiltersDto,
  CashflowFiltersDto,
  SalesReportFiltersDto,
} from './dto';
import { KpiSummaryResponseDto } from './dto/kpi-summary-response.dto';
import { SalesChartResponseDto } from './dto/sales-chart-response.dto';
import { CashflowResponseDto } from './dto/cashflow-response.dto';
import { DreResponseDto } from './dto/dre-response.dto';
import { SalesReportResponseDto } from './dto/sales-report-response.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpi-summary')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'KPI resumo — receita, despesas, margem, ticket medio',
  })
  @ApiResponse({ status: 200, type: KpiSummaryResponseDto })
  getKpiSummary(
    @WorkspaceId() workspaceId: string,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getKpiSummary(workspaceId, filters);
  }

  @Get('sales-chart')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Grafico de vendas — serie temporal agrupada por dia/semana/mes',
  })
  @ApiResponse({ status: 200, type: SalesChartResponseDto })
  getSalesChart(
    @WorkspaceId() workspaceId: string,
    @Query() filters: SalesChartFiltersDto,
  ) {
    return this.reportsService.getSalesChart(workspaceId, filters);
  }

  @Get('cashflow')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Fluxo de caixa — entradas vs saidas por periodo' })
  @ApiResponse({ status: 200, type: CashflowResponseDto })
  getCashflow(
    @WorkspaceId() workspaceId: string,
    @Query() filters: CashflowFiltersDto,
  ) {
    return this.reportsService.getCashflow(workspaceId, filters);
  }

  @Get('dre')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'DRE — Demonstrativo de Resultado do Exercicio' })
  @ApiResponse({ status: 200, type: DreResponseDto })
  getDre(
    @WorkspaceId() workspaceId: string,
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getDre(workspaceId, filters);
  }

  @Get('sales')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({
    summary: 'Relatorio de vendas — listagem paginada com totais',
  })
  @ApiResponse({ status: 200, type: SalesReportResponseDto })
  getSalesReport(
    @WorkspaceId() workspaceId: string,
    @Query() filters: SalesReportFiltersDto,
  ) {
    return this.reportsService.getSalesReport(workspaceId, filters);
  }
}
