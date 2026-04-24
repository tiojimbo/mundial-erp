'use client';

import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine, RiSearchLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useCreateDm } from '../hooks/use-channels';
import { useUsers } from '@/features/settings/hooks/use-users';
import { useAuth } from '@/providers/auth-provider';
import { useChatStore } from '@/stores/chat.store';

type CreateDmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AVATAR_COLORS = [
  '#7c3aed',
  '#e11d48',
  '#0891b2',
  '#059669',
  '#d97706',
  '#2563eb',
  '#db2777',
  '#9333ea',
  '#16a34a',
  '#dc2626',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

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

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSearch('');
    onOpenChange(nextOpen);
  }

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
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Overlay — acts as scroll container */}
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" />

        {/* Content */}
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex w-full max-w-md translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border border-[oklch(0.922_0_0)] bg-white p-6 shadow-lg">
          {/* Header */}
          <div className="flex flex-col gap-2 pr-8 text-left">
            <Dialog.Title className="text-[18px] font-semibold leading-none">
              Nova mensagem
            </Dialog.Title>
          </div>

          {/* Search */}
          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[oklch(0.556_0_0)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              autoFocus
              className="flex h-9 w-full min-w-0 rounded-md border border-[oklch(0.922_0_0)] bg-transparent pl-9 pr-3 py-1 text-[14px] shadow-xs outline-none transition-[color,box-shadow] placeholder:text-[oklch(0.556_0_0)] focus-visible:border-[oklch(0.708_0.165_254.624)] focus-visible:ring-[3px] focus-visible:ring-[oklch(0.708_0.165_254.624)]/50"
            />
          </div>

          {/* User list */}
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2 py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-md bg-[oklch(0.97_0_0)]"
                  />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[oklch(0.556_0_0)]">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u.id)}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-[oklch(0.97_0_0)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative flex size-8 shrink-0 overflow-hidden rounded-full">
                      <span
                        className="flex size-full items-center justify-center rounded-full text-[12px] font-semibold text-white"
                        style={{ backgroundColor: getAvatarColor(u.id) }}
                      >
                        {getInitials(u.name)}
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-medium">
                        {u.name}
                      </span>
                      <span className="truncate text-[12px] text-[oklch(0.556_0_0)]">
                        {u.email}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-1 opacity-70 transition-opacity hover:bg-[oklch(0.97_0_0)] hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[oklch(0.708_0.165_254.624)] focus:ring-offset-2 disabled:pointer-events-none"
            >
              <RiCloseLine className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
