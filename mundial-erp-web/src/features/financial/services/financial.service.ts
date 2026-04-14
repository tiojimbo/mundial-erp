import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  AccountReceivable,
  AccountPayable,
  Invoice,
  CashRegister,
  FinancialSummary,
  FinancialCategory,
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

function idempotencyHeaders() {
  return { 'Idempotency-Key': crypto.randomUUID() };
}

export const financialService = {
  // ===== Accounts Receivable =====

  async getAR(filters?: ARFilters): Promise<PaginatedResponse<AccountReceivable>> {
    const { data } = await api.get<PaginatedResponse<AccountReceivable>>(
      '/accounts-receivable',
      { params: filters },
    );
    return data;
  },

  async getARById(id: string): Promise<AccountReceivable> {
    const { data } = await api.get<AccountReceivable>(`/accounts-receivable/${id}`);
    return data;
  },

  async createAR(payload: CreateAccountReceivablePayload): Promise<AccountReceivable> {
    const { data } = await api.post<AccountReceivable>(
      '/accounts-receivable',
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  async registerARPayment(
    id: string,
    payload: RegisterPaymentPayload,
  ): Promise<AccountReceivable> {
    const { data } = await api.patch<AccountReceivable>(
      `/accounts-receivable/${id}/payment`,
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  // ===== Accounts Payable =====

  async getAP(filters?: APFilters): Promise<PaginatedResponse<AccountPayable>> {
    const { data } = await api.get<PaginatedResponse<AccountPayable>>(
      '/accounts-payable',
      { params: filters },
    );
    return data;
  },

  async getAPById(id: string): Promise<AccountPayable> {
    const { data } = await api.get<AccountPayable>(`/accounts-payable/${id}`);
    return data;
  },

  async createAP(payload: CreateAccountPayablePayload): Promise<AccountPayable> {
    const { data } = await api.post<AccountPayable>(
      '/accounts-payable',
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  async registerAPPayment(
    id: string,
    payload: RegisterPaymentPayload,
  ): Promise<AccountPayable> {
    const { data } = await api.patch<AccountPayable>(
      `/accounts-payable/${id}/payment`,
      payload,
      { headers: idempotencyHeaders() },
    );
    return data;
  },

  // ===== Invoices (NF-e) =====

  async getInvoices(filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> {
    const { data } = await api.get<PaginatedResponse<Invoice>>(
      '/invoices',
      { params: filters },
    );
    return data;
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },

  async getInvoicePdfUrl(id: string): Promise<string> {
    const { data } = await api.get<{ url: string }>(`/invoices/${id}/pdf`);
    return data.url;
  },

  async getInvoiceXml(id: string): Promise<string> {
    const { data } = await api.get<{ xml: string }>(`/invoices/${id}/xml`);
    return data.xml;
  },

  // ===== Cash Register =====

  async getCashRegisters(
    filters?: CashRegisterFilters,
  ): Promise<PaginatedResponse<CashRegister>> {
    const { data } = await api.get<PaginatedResponse<CashRegister>>(
      '/cash-registers',
      { params: filters },
    );
    return data;
  },

  async getCashRegisterById(id: string): Promise<CashRegister> {
    const { data } = await api.get<CashRegister>(`/cash-registers/${id}`);
    return data;
  },

  async openCashRegister(payload: OpenCashRegisterPayload): Promise<CashRegister> {
    const { data } = await api.post<CashRegister>('/cash-registers', payload);
    return data;
  },

  async closeCashRegister(
    id: string,
    payload: CloseCashRegisterPayload,
  ): Promise<CashRegister> {
    const { data } = await api.patch<CashRegister>(
      `/cash-registers/${id}/close`,
      payload,
    );
    return data;
  },

  // ===== Financial Summary =====

  async getSummary(): Promise<FinancialSummary> {
    const { data } = await api.get<FinancialSummary>('/financial/summary');
    return data;
  },

  // ===== Lookups =====

  async getCategories(): Promise<FinancialCategory[]> {
    const { data } = await api.get<FinancialCategory[]>('/financial-categories');
    return data;
  },
};
