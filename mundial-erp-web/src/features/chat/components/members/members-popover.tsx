'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  RiUserAddLine,
  RiCloseLine,
  RiNotification3Line,
  RiLockLine,
  RiShareLine,
} from '@remixicon/react';
import { useChannelMembers, useAddMembers } from '../../hooks/use-channels';
import { useAuth } from '@/providers/auth-provider';
import type { ChannelMember } from '../../types/chat.types';

type MembersPopoverProps = {
  channelId: string;
  children: React.ReactNode;
};

type Tab = 'followers' | 'access' | 'share';

export function MembersPopover({
  channelId,
  children,
}: MembersPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('followers');
  const [searchInput, setSearchInput] = useState('');
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data } = useChannelMembers(channelId);
  const { mutate: addMembers } = useAddMembers(channelId);
  const { user } = useAuth();

  const members: ChannelMember[] =
    data?.pages.flatMap((page) => page.data) ?? [];

  const followers = members.filter((m) => m.isFollower);
  const filteredList = activeTab === 'followers' ? followers : members;
  const filtered = searchInput
    ? filteredList.filter((m) =>
        m.user.name.toLowerCase().includes(searchInput.toLowerCase()),
      )
    : filteredList;

  const handleToggle = useCallback(() => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((prev) => !prev);
  }, [open]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Fechar com Escape
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  const handleAdd = () => {
    const id = prompt('ID do usuario para adicionar:');
    if (id?.trim()) {
      addMembers({ userIds: [id.trim()] });
    }
  };

  return (
    <>
      <span ref={triggerRef} onClick={handleToggle}>
        {children}
      </span>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className='fixed z-[100] w-[360px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-md'
            style={{ top: position.top, right: position.right }}
          >
            {/* Header */}
            <div className='flex items-center justify-between px-4 pb-2 pt-4'>
              <h3 className='text-label-sm font-semibold text-text-strong-950'>
                Observadores
              </h3>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='flex size-6 items-center justify-center rounded-md text-text-soft-400 transition-colors hover:bg-bg-weak-50'
              >
                <RiCloseLine className='size-4' />
              </button>
            </div>

            {/* Tabs */}
            <div className='flex items-center gap-1 px-4 pb-2'>
              <TabButton
                active={activeTab === 'followers'}
                onClick={() => setActiveTab('followers')}
                icon={RiNotification3Line}
                label='Observadores'
                count={followers.length}
              />
              <TabButton
                active={activeTab === 'access'}
                onClick={() => setActiveTab('access')}
                icon={RiLockLine}
                label='Acesso'
                count={members.length}
              />
              <TabButton
                active={activeTab === 'share'}
                onClick={() => setActiveTab('share')}
                icon={RiShareLine}
                label='Compartilhar'
              />
            </div>

            {/* Search */}
            <div className='px-4 pb-2'>
              <input
                type='text'
                placeholder='Buscar pessoas ou convidar por email'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className='w-full rounded-lg border border-stroke-soft-200 px-3 py-1.5 text-paragraph-xs text-text-strong-950 outline-none placeholder:text-text-soft-400 focus:border-stroke-strong-950/20'
              />
            </div>

            {/* Content */}
            <div className='max-h-[240px] overflow-y-auto px-2 pb-2'>
              {activeTab === 'share' ? (
                <div className='px-2 py-6 text-center text-paragraph-xs text-text-soft-400'>
                  Compartilhamento em breve
                </div>
              ) : (
                <>
                  <div className='px-2 pb-1 pt-2'>
                    <span className='text-[11px] font-semibold uppercase tracking-wide text-text-soft-400'>
                      {activeTab === 'followers'
                        ? 'Observadores'
                        : 'Membros com acesso'}
                    </span>
                  </div>

                  <button
                    type='button'
                    onClick={handleAdd}
                    className='flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-[14px] transition-colors hover:bg-bg-weak-50'
                  >
                    <span className='flex size-8 items-center justify-center rounded-full border border-dashed border-stroke-soft-200 text-text-soft-400'>
                      <RiUserAddLine className='size-4' />
                    </span>
                    <span className='text-text-strong-950'>
                      Adicionar Pessoas
                    </span>
                  </button>

                  {filtered.map((member) => {
                    const initials = member.user.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();
                    const isYou = user?.id === member.userId;

                    return (
                      <div
                        key={member.id}
                        className='flex items-center justify-between rounded-lg px-2 py-1.5'
                      >
                        <div className='flex items-center gap-3'>
                          <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[11px] font-semibold text-white'>
                            {initials}
                          </span>
                          <span className='text-[14px] text-text-strong-950'>
                            {member.user.name}
                            {isYou && (
                              <span className='text-text-soft-400'>
                                {' '}
                                (voce)
                              </span>
                            )}
                          </span>
                        </div>
                        {activeTab === 'access' && (
                          <span className='rounded bg-bg-weak-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-text-soft-400'>
                            {member.role}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {filtered.length === 0 && (
                    <p className='px-2 py-4 text-center text-paragraph-xs text-text-soft-400'>
                      Nenhum membro encontrado
                    </p>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors ${
        active
          ? 'bg-text-strong-950 text-white'
          : 'text-text-sub-600 hover:bg-bg-weak-50'
      }`}
    >
      <Icon className='size-3.5' />
      {label}
      {count !== undefined && (
        <span
          className={`ml-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold ${
            active
              ? 'bg-white/20 text-white'
              : 'bg-bg-weak-50 text-text-soft-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
