import { api } from '@/lib/api';
import type {
  DREReport,
  SalesReport,
  CashFlowReport,
  ReportFilters,
} from '../types/report.types';

export const reportService = {
  async getDRE(filters?: ReportFilters): Promise<DREReport> {
    const { data } = await api.get<DREReport>('/reports/dre', {
      params: filters,
    });
    return data;
  },

  async getSales(filters?: ReportFilters): Promise<SalesReport> {
    const { data } = await api.get<SalesReport>('/reports/sales', {
      params: filters,
    });
    return data;
  },

  async getCashFlow(filters?: ReportFilters): Promise<CashFlowReport> {
    const { data } = await api.get<CashFlowReport>('/reports/cash-flow', {
      params: filters,
    });
    return data;
  },
};
