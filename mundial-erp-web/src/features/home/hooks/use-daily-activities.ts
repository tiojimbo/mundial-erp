import { useQuery } from '@tanstack/react-query';
import { homeService } from '../services/home.service';

export const DAILY_ACTIVITIES_KEY = ['daily-activities'];

export function useDailyActivities() {
  return useQuery({
    queryKey: DAILY_ACTIVITIES_KEY,
    queryFn: () => homeService.getDailyActivities(),
    refetchInterval: 60 * 1000,
  });
}
