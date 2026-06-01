'use client';

import * as Avatar from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/api';

const AVATAR_COLORS = [
  'rgb(217, 119, 6)',
  'rgb(220, 38, 38)',
  'rgb(124, 58, 237)',
  'rgb(37, 99, 235)',
  'rgb(5, 150, 105)',
  'rgb(219, 39, 119)',
];

function colorOf(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1)
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Size = '20' | '24' | '32' | '40' | '48' | '56' | '64' | '72' | '80';

type UserLike =
  | {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      avatar?: string | null;
    }
  | null
  | undefined;

type Props = {
  user: UserLike;
  size?: Size;
  className?: string;
};

export function UserAvatar({ user, size = '24', className }: Props) {
  const label = user?.name || user?.email || '?';
  const src = getAvatarUrl(user?.avatar);
  const seed = user?.id || label;
  return (
    <Avatar.Root size={size} className={className}>
      {src ? (
        <Avatar.Image src={src} alt={label} />
      ) : (
        <span
          className='flex size-full items-center justify-center rounded-full font-medium text-static-white'
          style={{ backgroundColor: colorOf(seed) }}
        >
          {initialsOf(label)}
        </span>
      )}
    </Avatar.Root>
  );
}
