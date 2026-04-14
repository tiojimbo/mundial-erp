import { api } from '@/lib/api';
import type { CompanySettings, UpdateCompanyPayload } from '../types/settings.types';

export const companyService = {
  async get(): Promise<CompanySettings> {
    const { data } = await api.get<CompanySettings>('/company');
    return data;
  },

  async update(payload: UpdateCompanyPayload): Promise<CompanySettings> {
    const { data } = await api.patch<CompanySettings>('/company', payload);
    return data;
  },

  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const { data } = await api.post<{ logoUrl: string }>('/company/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
