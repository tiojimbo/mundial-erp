import { api } from '@/lib/api';
import type {
  DailyActivitiesResponse,
  PendingHandoffsResponse,
} from '../types/home.types';

export const homeService = {
  async getDailyActivities(): Promise<DailyActivitiesResponse> {
    const { data } = await api.get<DailyActivitiesResponse>(
      '/activity-instances/daily',
    );
    return data;
  },

  async getPendingHandoffs(): Promise<PendingHandoffsResponse> {
    const { data } = await api.get<PendingHandoffsResponse>(
      '/handoff-instances/pending',
    );
    return data;
  },

  async acceptHandoff(id: string): Promise<void> {
    await api.patch(`/handoff-instances/${id}/accept`);
  },

  async rejectHandoff(id: string): Promise<void> {
    await api.patch(`/handoff-instances/${id}/reject`);
  },
};
