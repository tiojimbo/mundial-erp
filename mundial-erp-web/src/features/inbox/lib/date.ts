import { isToday, isYesterday, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DateGroup =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'older';

const GROUP_ORDER: DateGroup[] = [
  'today',
  'yesterday',
  'last7days',
  'last30days',
  'older',
];

export function groupNotificationsByDate<T extends { createdAt: string }>(
  items: T[],
): Map<DateGroup, T[]> {
  const groups = new Map<DateGroup, T[]>();

  for (const item of items) {
    const date = new Date(item.createdAt);
    const now = new Date();
    let group: DateGroup;

    if (isToday(date)) {
      group = 'today';
    } else if (isYesterday(date)) {
      group = 'yesterday';
    } else if (differenceInDays(now, date) <= 7) {
      group = 'last7days';
    } else if (differenceInDays(now, date) <= 30) {
      group = 'last30days';
    } else {
      group = 'older';
    }

    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(item);
  }

  // Return in correct chronological order
  const ordered = new Map<DateGroup, T[]>();
  for (const key of GROUP_ORDER) {
    if (groups.has(key)) {
      ordered.set(key, groups.get(key)!);
    }
  }
  return ordered;
}

export function getGroupLabel(group: DateGroup): string {
  const labels: Record<DateGroup, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7days: 'Last 7 days',
    last30days: 'Last 30 days',
    older: 'Older',
  };
  return labels[group];
}

export function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  if (isToday(date)) {
    return format(date, 'HH:mm');
  }

  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "d 'de' MMM", { locale: ptBR });
  }

  return format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR });
}
