import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { financialService } from '../services/financial.service';
import type {
  ARFilters,
  APFilters,
  InvoiceFilters,
  CashRegisterFilters,
  RegisterPaymentPayload,
  CreateAccountReceivablePayload,
  CreateAccountPayablePayload,
  OpenCashRegisterPayload,
  CloseCashRegisterPayload,
} from '../types/financial.types';

// ===== Query Keys =====

export const AR_KEY = ['accounts-receivable'];
export const AP_KEY = ['accounts-payable'];
export const INVOICES_KEY = ['invoices'];
export const CASH_REGISTERS_KEY = ['cash-registers'];
export const FINANCIAL_SUMMARY_KEY = ['financial-summary'];
export const FINANCIAL_CATEGORIES_KEY = ['financial-categories'];

// ===== Accounts Receivable =====

export function useAccountsReceivable(filters?: ARFilters) {
  return useQuery({
    queryKey: [...AR_KEY, filters],
    queryFn: () => financialService.getAR(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAccountReceivable(id: string) {
  return useQuery({
    queryKey: [...AR_KEY, id],
    queryFn: () => financialService.getARById(id),
    enabled: !!id,
  });
}

export function useCreateAR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountReceivablePayload) =>
      financialService.createAR(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AR_KEY });
      qc.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
}

export function useRegisterARPayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPaymentPayload) =>
      financialService.registerARPayment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AR_KEY });
      qc.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
}

// ===== Accounts Payable =====

export function useAccountsPayable(filters?: APFilters) {
  return useQuery({
    queryKey: [...AP_KEY, filters],
    queryFn: () => financialService.getAP(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAccountPayable(id: string) {
  return useQuery({
    queryKey: [...AP_KEY, id],
    queryFn: () => financialService.getAPById(id),
    enabled: !!id,
  });
}

export function useCreateAP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountPayablePayload) =>
      financialService.createAP(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AP_KEY });
      qc.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
}

export function useRegisterAPPayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPaymentPayload) =>
      financialService.registerAPPayment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AP_KEY });
      qc.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
}

// ===== Invoices =====

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: [...INVOICES_KEY, filters],
    queryFn: () => financialService.getInvoices(filters),
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: [...INVOICES_KEY, id],
    queryFn: () => financialService.getInvoiceById(id),
    enabled: !!id,
  });
}

// ===== Cash Register =====

export function useCashRegisters(filters?: CashRegisterFilters) {
  return useQuery({
    queryKey: [...CASH_REGISTERS_KEY, filters],
    queryFn: () => financialService.getCashRegisters(filters),
    placeholderData: (prev) => prev,
  });
}

export function useCashRegister(id: string) {
  return useQuery({
    queryKey: [...CASH_REGISTERS_KEY, id],
    queryFn: () => financialService.getCashRegisterById(id),
    enabled: !!id,
  });
}

export function useOpenCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenCashRegisterPayload) =>
      financialService.openCashRegister(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CASH_REGISTERS_KEY });
      qc.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
}

export function useCloseCashRegister(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CloseCashRegisterPayload) =>
      financialService.closeCashRegister(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CASH_REGISTERS_KEY });
      qc.invalidateQueries({ queryKey: FINANCIAL_SUMMARY_KEY });
    },
  });
}

// ===== Financial Summary =====

export function useFinancialSummary() {
  return useQuery({
    queryKey: FINANCIAL_SUMMARY_KEY,
    queryFn: () => financialService.getSummary(),
  });
}

// ===== Lookups =====

export function useFinancialCategories() {
  return useQuery({
    queryKey: FINANCIAL_CATEGORIES_KEY,
    queryFn: () => financialService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}
