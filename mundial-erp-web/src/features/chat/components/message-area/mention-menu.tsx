'use client';

import { useState, useEffect, useRef } from 'react';
import { RiTeamLine, RiUserFollowLine, RiUserStarLine } from '@remixicon/react';
import { useChannelMembers } from '../../hooks/use-channels';
import type { ChannelMember } from '../../types/chat.types';

type MentionMenuProps = {
  channelId: string;
  query: string;
  visible: boolean;
  onSelect: (mention: string) => void;
  onClose: () => void;
};

type MentionItem = {
  label: string;
  value: string;
  description?: string;
  type: 'special' | 'user';
  initials?: string;
};

const SPECIAL_MENTIONS: MentionItem[] = [
  {
    label: '@everyone',
    value: '@everyone',
    description: 'Notificar todos os membros do canal',
    type: 'special',
  },
  {
    label: '@followers',
    value: '@followers',
    description: 'Notificar todos os observadores',
    type: 'special',
  },
  {
    label: '@assignees',
    value: '@assignees',
    description: 'Mencionar todos os responsaveis',
    type: 'special',
  },
];

export function MentionMenu({
  channelId,
  query,
  visible,
  onSelect,
  onClose,
}: MentionMenuProps) {
  const { data } = useChannelMembers(channelId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const members: ChannelMember[] =
    data?.pages.flatMap((page) => page.data) ?? [];

  const userItems: MentionItem[] = members.map((m) => ({
    label: `@${m.user.name}`,
    value: `@${m.user.name}`,
    type: 'user',
    initials: m.user.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase(),
  }));

  const allItems = [...SPECIAL_MENTIONS, ...userItems];

  const filtered = query
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(`@${query}`.toLowerCase()) ||
        item.label.toLowerCase().includes(query.toLowerCase()),
      )
    : allItems;

  // Reset ao mudar query
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard
  useEffect(() => {
    if (!visible || filtered.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].value);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, filtered, selectedIndex, onSelect, onClose]);

  // Scroll ativo
  useEffect(() => {
    if (!menuRef.current) return;
    const active = menuRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!visible || filtered.length === 0) return null;

  // Separar especiais e usuarios
  const specials = filtered.filter((i) => i.type === 'special');
  const users = filtered.filter((i) => i.type === 'user');

  return (
    <div
      ref={menuRef}
      className='absolute bottom-full left-0 z-50 mb-1 w-[300px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-regular-md'
    >
      {specials.length > 0 && (
        <>
          <div className='px-3 pb-1 pt-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wide text-text-soft-400'>
              Atalhos
            </span>
          </div>
          {specials.map((item, i) => {
            const globalIndex = filtered.indexOf(item);
            return (
              <MentionRow
                key={item.value}
                item={item}
                isSelected={globalIndex === selectedIndex}
                onSelect={onSelect}
              />
            );
          })}
        </>
      )}

      {users.length > 0 && (
        <>
          <div className='px-3 pb-1 pt-2'>
            <span className='text-[11px] font-semibold uppercase tracking-wide text-text-soft-400'>
              Pessoas
            </span>
          </div>
          <div className='max-h-[180px] overflow-y-auto'>
            {users.map((item) => {
              const globalIndex = filtered.indexOf(item);
              return (
                <MentionRow
                  key={item.value}
                  item={item}
                  isSelected={globalIndex === selectedIndex}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MentionRow({
  item,
  isSelected,
  onSelect,
}: {
  item: MentionItem;
  isSelected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type='button'
      data-active={isSelected || undefined}
      onClick={() => onSelect(item.value)}
      className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-[14px] transition-colors ${
        isSelected ? 'bg-primary-base/5' : 'hover:bg-bg-weak-50'
      }`}
    >
      {item.type === 'special' ? (
        <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-[oklch(94%_0_0)] text-text-sub-600'>
          {item.value === '@everyone' && <RiTeamLine className='size-4' />}
          {item.value === '@followers' && (
            <RiUserFollowLine className='size-4' />
          )}
          {item.value === '@assignees' && (
            <RiUserStarLine className='size-4' />
          )}
        </span>
      ) : (
        <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[10px] font-semibold text-white'>
          {item.initials}
        </span>
      )}
      <div className='min-w-0 flex-1'>
        <span className='font-medium text-text-strong-950'>
          {item.label}
        </span>
        {item.description && (
          <p className='truncate text-[12px] text-text-soft-400'>
            {item.description}
          </p>
        )}
      </div>
    </button>
  );
}
