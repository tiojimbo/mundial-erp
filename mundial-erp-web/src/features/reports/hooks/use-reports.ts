import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/report.service';
import type { ReportFilters } from '../types/report.types';

// ===== Query Keys =====

export const REPORTS_KEY = ['reports'];
export const DRE_KEY = [...REPORTS_KEY, 'dre'];
export const SALES_KEY = [...REPORTS_KEY, 'sales'];
export const CASH_FLOW_KEY = [...REPORTS_KEY, 'cash-flow'];

// ===== DRE =====

export function useDREReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: [...DRE_KEY, filters],
    queryFn: () => reportService.getDRE(filters),
    enabled: !!filters?.from && !!filters?.to,
  });
}

// ===== Sales =====

export function useSalesReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: [...SALES_KEY, filters],
    queryFn: () => reportService.getSales(filters),
    enabled: !!filters?.from && !!filters?.to,
  });
}

// ===== Cash Flow =====

export function useCashFlowReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: [...CASH_FLOW_KEY, filters],
    queryFn: () => reportService.getCashFlow(filters),
    enabled: !!filters?.from && !!filters?.to,
  });
}
