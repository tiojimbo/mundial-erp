'use client';

import { useState, useMemo } from 'react';
import { RiUserLine, RiSearchLine } from '@remixicon/react';
import * as Modal from '@/components/ui/modal';
import * as Input from '@/components/ui/input';
import { useCreateDm } from '../hooks/use-channels';
import { useUsers } from '@/features/settings/hooks/use-users';
import { useAuth } from '@/providers/auth-provider';
import { useChatStore } from '@/stores/chat.store';
import { useRouter } from 'next/navigation';

type CreateDmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateDmDialog({ open, onOpenChange }: CreateDmDialogProps) {
  const [search, setSearch] = useState('');
  const { mutate: createDm, isPending } = useCreateDm();
  const { user: currentUser } = useAuth();
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const router = useRouter();

  const { data: usersData, isLoading } = useUsers({
    limit: 10000,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const users = useMemo(() => {
    const all = usersData?.data ?? [];
    const filtered = all.filter((u) => u.id !== currentUser?.id);
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [usersData, currentUser?.id, search]);

  const handleSelectUser = (userId: string) => {
    if (isPending) return;
    createDm(
      { userIds: [userId] },
      {
        onSuccess: (channel) => {
          setActiveChannel(channel.id);
          router.push(`/chat/${channel.id}`);
          onOpenChange(false);
          setSearch('');
        },
      },
    );
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserLine}
          title='Nova Mensagem'
          description='Selecione um usuario para iniciar uma conversa.'
        />
        <Modal.Body className='space-y-3'>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.Input
                placeholder='Buscar por nome ou email...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </Input.Wrapper>
          </Input.Root>

          <div className='max-h-[320px] overflow-y-auto'>
            {isLoading ? (
              <div className='space-y-2 p-2'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className='h-10 animate-pulse rounded-lg bg-bg-weak-50'
                  />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className='py-8 text-center text-paragraph-sm text-text-sub-600'>
                Nenhum usuario encontrado.
              </p>
            ) : (
              <ul className='space-y-0.5'>
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      type='button'
                      onClick={() => handleSelectUser(u.id)}
                      disabled={isPending}
                      className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-bg-weak-50 disabled:opacity-50'
                    >
                      <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-base text-[11px] font-semibold text-white'>
                        {u.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-label-sm text-text-strong-950'>
                          {u.name}
                        </p>
                        <p className='truncate text-paragraph-xs text-text-sub-600'>
                          {u.email}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
