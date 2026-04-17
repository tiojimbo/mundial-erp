import type { Notification } from '../types/notification.types';
import type { DateGroup } from '../lib/date';
import { getGroupLabel } from '../lib/date';
import { NotificationItem } from './notification-item';

type NotificationGroupProps = {
  group: DateGroup;
  items: Notification[];
  onRead: (id: string) => void;
  onUnread: (id: string) => void;
  onClear: (id: string) => void;
  onNavigate: (url: string) => void;
};

export function NotificationGroup({
  group,
  items,
  onRead,
  onUnread,
  onClear,
  onNavigate,
}: NotificationGroupProps) {
  return (
    <li className='list-none'>
      <h3 className='bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground'>
        {getGroupLabel(group)}
      </h3>
      <ul role='list'>
        {items.map((item) => (
          <li key={item.id} tabIndex={0}>
            <NotificationItem
              notification={item}
              onRead={onRead}
              onUnread={onUnread}
              onClear={onClear}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}
