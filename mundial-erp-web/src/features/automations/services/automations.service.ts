import { api } from '@/lib/api';
import type {
  Automation,
  AutomationActionDef,
  AutomationTriggerDef,
  CreateAutomationPayload,
  UpdateAutomationPayload,
} from '../types/automation.types';

export const automationsService = {
  async list(): Promise<Automation[]> {
    const { data } = await api.get<Automation[]>('/ai/automation');
    return data;
  },

  async getById(id: string): Promise<Automation> {
    const { data } = await api.get<Automation>(`/ai/automation/${id}`);
    return data;
  },

  async create(payload: CreateAutomationPayload): Promise<Automation> {
    const { data } = await api.post<Automation>('/ai/automation', payload);
    return data;
  },

  async update(
    id: string,
    payload: UpdateAutomationPayload,
  ): Promise<Automation> {
    const { data } = await api.put<Automation>(`/ai/automation/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<Automation> {
    const { data } = await api.delete<Automation>(`/ai/automation/${id}`);
    return data;
  },

  async toggle(id: string): Promise<Automation> {
    const { data } = await api.post<Automation>(
      `/ai/automation/${id}/toggle`,
      {},
    );
    return data;
  },

  async listTriggers(): Promise<AutomationTriggerDef[]> {
    const { data } = await api.get<AutomationTriggerDef[]>(
      '/ai/automation/triggers',
    );
    return data;
  },

  async listActions(): Promise<AutomationActionDef[]> {
    const { data } = await api.get<AutomationActionDef[]>(
      '/ai/automation/actions',
    );
    return data;
  },
};
