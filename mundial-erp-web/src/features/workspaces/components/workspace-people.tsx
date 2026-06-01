'use client';

import { useMemo, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  RiSearchLine,
  RiUserAddLine,
  RiShieldUserLine,
  RiDeleteBinLine,
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiTimeLine,
  RiMore2Fill,
  RiCheckLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Badge from '@/components/ui/badge';
import * as Button from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useWorkspaceUsers } from '../hooks/use-workspace-members';
import { useBulkAddUsers } from '../hooks/use-add-member';
import { useSetUserPermission } from '../hooks/use-update-member-role';
import { useRemoveUser } from '../hooks/use-remove-member';
import type { WorkspaceRole, WorkspaceUser } from '../types/workspace.types';

const PERMISSION_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  EDITOR: 'Membro',
  GUEST: 'Convidado',
};

// Funcoes atribuiveis pela UI (OWNER e do criador do workspace, nao atribuivel).
const ASSIGNABLE: WorkspaceRole[] = ['ADMIN', 'EDITOR', 'GUEST'];

function badgeColor(role: WorkspaceRole) {
  switch (role) {
    case 'OWNER':
      return 'orange' as const;
    case 'ADMIN':
      return 'purple' as const;
    case 'EDITOR':
      return 'blue' as const;
    case 'GUEST':
      return 'gray' as const;
  }
}

function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const email = piece.trim().toLowerCase();
    if (email.length === 0 || seen.has(email)) continue;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function WorkspacePeople() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id ?? '');
  const { data, isLoading } = useWorkspaceUsers(workspaceId, {
    showPending: true,
    limit: 100,
  });
  const bulkAdd = useBulkAddUsers(workspaceId);
  const setPermission = useSetUserPermission(workspaceId);
  const removeUser = useRemoveUser(workspaceId);

  const [search, setSearch] = useState('');
  const [emails, setEmails] = useState('');
  const [defaultPermission, setDefaultPermission] =
    useState<WorkspaceRole>('EDITOR');

  const users = useMemo(() => data?.users ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const validEmails = useMemo(() => parseEmails(emails), [emails]);

  function handleInvite() {
    if (validEmails.length === 0) return;
    bulkAdd.mutate(
      {
        users: validEmails.map((email) => ({
          email,
          permission: defaultPermission,
        })),
      },
      { onSuccess: () => setEmails('') },
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-label-lg text-text-strong-950'>
          Gerenciar pessoas
        </h1>
        <Button.Root variant='neutral' mode='stroke' size='xsmall'>
          Exportar
        </Button.Root>
      </div>

      {/* Buscar + Convidar */}
      <div className='grid grid-cols-1 gap-6 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-6 lg:grid-cols-2 lg:divide-x lg:divide-stroke-soft-200'>
        {/* Buscar */}
        <div className='lg:pr-6'>
          <div className='mb-3 flex items-center gap-2'>
            <RiSearchLine className='size-5 text-text-sub-600' />
            <h2 className='text-label-md text-text-strong-950'>
              Buscar pessoas
            </h2>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Pesquisar pessoas...'
            className='shadow-xs w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none'
          />
        </div>

        {/* Convidar */}
        <div className='lg:pl-6'>
          <div className='mb-4 flex items-start gap-2'>
            <RiUserAddLine className='mt-0.5 size-5 text-text-sub-600' />
            <div>
              <h2 className='text-label-md text-text-strong-950'>
                Convidar pessoas
              </h2>
              <p className='text-paragraph-xs text-text-sub-600'>
                Adicione e-mails e defina as permissões para cada convidado
              </p>
            </div>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='flex-1'>
              <label className='mb-1 block text-paragraph-xs text-text-sub-600'>
                E-mails dos convidados
              </label>
              <input
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder='exemplo@email.com, outro@email.com'
                className='shadow-xs w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none'
              />
            </div>
            <div className='sm:w-40'>
              <label className='mb-1 block text-paragraph-xs text-text-sub-600'>
                Permissão padrão
              </label>
              <select
                value={defaultPermission}
                onChange={(e) =>
                  setDefaultPermission(e.target.value as WorkspaceRole)
                }
                className='shadow-xs w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm focus:border-primary-base focus:outline-none'
              >
                {ASSIGNABLE.map((role) => (
                  <option key={role} value={role}>
                    {PERMISSION_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className='mt-4 flex justify-end'>
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              disabled={validEmails.length === 0 || bulkAdd.isPending}
              onClick={handleInvite}
            >
              {bulkAdd.isPending ? 'Convidando...' : 'Convidar'}
            </Button.Root>
          </div>
        </div>
      </div>

      {/* Membros */}
      <div>
        <p className='mb-3 text-label-sm text-text-sub-600'>
          Membros plenos ({users.length})
        </p>
        <div className='overflow-hidden rounded-xl border border-stroke-soft-200'>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head className='w-20'>Status</Table.Head>
                <Table.Head>Nome</Table.Head>
                <Table.Head>E-mail</Table.Head>
                <Table.Head>Função</Table.Head>
                <Table.Head className='w-16 text-right'>
                  Configurações
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Table.Row key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <Table.Cell key={j}>
                        <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-50' />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))
              ) : filtered.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5}>
                    <p className='py-6 text-center text-paragraph-sm text-text-soft-400'>
                      Nenhuma pessoa encontrada.
                    </p>
                  </Table.Cell>
                </Table.Row>
              ) : (
                filtered.map((user) => (
                  <Table.Row key={user.id}>
                    <Table.Cell>
                      {user.accepted ? (
                        <RiCheckboxCircleFill className='size-5 text-green-500' />
                      ) : (
                        <RiTimeLine className='size-5 text-orange-400' />
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className='flex items-center gap-2.5'>
                        <UserAvatar user={user} size='32' />
                        <span className='text-label-sm text-text-strong-950'>
                          {user.name || '—'}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className='text-paragraph-sm text-text-sub-600'>
                      {user.email}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge.Root
                        variant='lighter'
                        size='small'
                        color={badgeColor(user.permission)}
                      >
                        {PERMISSION_LABELS[user.permission]}
                      </Badge.Root>
                    </Table.Cell>
                    <Table.Cell className='text-right'>
                      {user.permission !== 'OWNER' && (
                        <RowMenu
                          user={user}
                          onSetPermission={(permission) =>
                            setPermission.mutate({
                              userId: user.id,
                              permission,
                            })
                          }
                          onRemove={() => removeUser.mutate(user.id)}
                        />
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    </div>
  );
}

function RowMenu({
  user,
  onSetPermission,
  onRemove,
}: {
  user: WorkspaceUser;
  onSetPermission: (permission: WorkspaceRole) => void;
  onRemove: () => void;
}) {
  const menuItem =
    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-paragraph-sm text-text-strong-950 outline-none data-[highlighted]:bg-bg-weak-50';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className='rounded-md p-1.5 text-text-sub-600 outline-none hover:bg-bg-weak-50'>
          <RiMore2Fill className='size-4' />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align='end'
          sideOffset={4}
          className='shadow-md z-50 min-w-[180px] rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1'
        >
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={menuItem}>
              <RiShieldUserLine className='size-4 text-text-sub-600' />
              <span className='flex-1'>Alterar função</span>
              <RiArrowRightSLine className='size-4 text-text-soft-400' />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={2}
                className='shadow-md z-50 min-w-[160px] rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-1'
              >
                {ASSIGNABLE.map((role) => {
                  const current = role === user.permission;
                  return (
                    <DropdownMenu.Item
                      key={role}
                      disabled={current}
                      onSelect={() => onSetPermission(role)}
                      className={`${menuItem} ${current ? 'opacity-50' : ''}`}
                    >
                      <span className='flex-1'>{PERMISSION_LABELS[role]}</span>
                      {current && (
                        <RiCheckLine className='size-4 text-text-sub-600' />
                      )}
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Item
            onSelect={onRemove}
            className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-paragraph-sm text-error-base outline-none data-[highlighted]:bg-error-lighter'
          >
            <RiDeleteBinLine className='size-4' />
            Remover
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
