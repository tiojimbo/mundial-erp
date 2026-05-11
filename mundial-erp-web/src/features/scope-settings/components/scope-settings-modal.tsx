'use client';

import { useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiCloseLine,
  RiGlobalLine,
  RiInformation2Line,
  RiLayoutGridLine,
  RiLinkM,
  RiLockLine,
  RiLockUnlockLine,
  RiPencilLine,
  RiShieldLine,
  RiUserUnfollowLine,
} from '@remixicon/react';
import * as Modal from '@/components/ui/modal';
import * as Tooltip from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { useUsers } from '@/features/settings/hooks/use-users';
import {
  useScopeVisibility,
  useSetScopeVisibility,
} from '../hooks/use-scope-visibility';
import {
  useAddScopeMember,
  useRemoveScopeMember,
  useScopeMembers,
  useUpdateScopeMember,
} from '../hooks/use-scope-members';
import {
  SCOPE_LABEL,
  type Permission,
  type ScopeKind,
  type ScopeMember,
} from '../types/scope.types';

const PERMISSION_LABELS: Record<
  Permission,
  { title: string; description: string; Icon: typeof RiPencilLine }
> = {
  FULL_EDIT: {
    title: 'Edição completa',
    description: 'Editar, excluir e gerenciar membros',
    Icon: RiShieldLine,
  },
  EDIT: {
    title: 'Pode editar',
    description: 'Criar e editar conteúdo',
    Icon: RiPencilLine,
  },
  COMMENT: {
    title: 'Pode comentar',
    description: 'Ver e comentar',
    Icon: RiPencilLine,
  },
  VIEW: {
    title: 'Pode ver',
    description: 'Somente leitura',
    Icon: RiPencilLine,
  },
};

const PERMISSIONS: Permission[] = ['FULL_EDIT', 'EDIT', 'COMMENT', 'VIEW'];

const COLOR_PALETTE = [
  '#7C3AED',
  '#E11D48',
  '#D97706',
  '#059669',
  '#2563EB',
  '#DB2777',
];

function initialsOf(name: string | null | undefined, email: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

export type ScopeSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ScopeKind;
  id: string;
  name: string;
};

export function ScopeSettingsModal({
  open,
  onOpenChange,
  scope,
  id,
  name,
}: ScopeSettingsModalProps) {
  const label = SCOPE_LABEL[scope];

  const visibility = useScopeVisibility(scope, id);
  const setVisibility = useSetScopeVisibility(scope, id);

  const members = useScopeMembers(scope, id);
  const updateMember = useUpdateScopeMember(scope, id);
  const removeMember = useRemoveScopeMember(scope, id);
  const addMember = useAddScopeMember(scope, id);

  const usersQuery = useUsers();
  const allUsers = usersQuery.data?.data ?? [];

  const [search, setSearch] = useState('');

  const memberIdSet = useMemo(
    () => new Set((members.data ?? []).map((m) => m.userId)),
    [members.data],
  );

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allUsers
      .filter(
        (u) =>
          !memberIdSet.has(u.id) &&
          (u.name?.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [allUsers, memberIdSet, search]);

  const isPrivate = visibility.data?.visibility === 'PRIVATE';
  const memberCount = members.data?.length ?? 0;

  const handleAdd = (userId: string) => {
    addMember.mutate(
      { userId, permission: 'EDIT' },
      { onSuccess: () => setSearch('') },
    );
  };

  const handleTogglePrivacy = () => {
    setVisibility.mutate(isPrivate ? 'PUBLIC' : 'PRIVATE');
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content
        className='max-w-md gap-0 !p-0'
        showClose={false}
      >
        <div className='flex flex-col gap-2 px-5 pt-5 pb-0'>
          <h2 className='text-base font-semibold'>
            Compartilhar este {label}
          </h2>
          <div className='mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span>Compartilhando {label} com todas as views</span>
            <RiLayoutGridLine className='size-3.5' aria-hidden />
            <span className='font-medium text-foreground'>{name}</span>
          </div>
        </div>

        <div className='relative px-5 pt-4'>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar membro para adicionar...'
            className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
          />
          {candidates.length > 0 && (
            <ul className='absolute left-5 right-5 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md'>
              {candidates.map((u) => (
                <li key={u.id}>
                  <button
                    type='button'
                    onClick={() => handleAdd(u.id)}
                    disabled={addMember.isPending}
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent'
                  >
                    <Initials
                      seed={u.id}
                      label={initialsOf(u.name, u.email)}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium'>{u.name}</p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {u.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className='mt-4 h-px shrink-0 bg-border' />

        <div className='px-5 py-3'>
          <DisabledRow
            Icon={RiLinkM}
            title='Link privado'
            tooltip='Compartilhamento por link ainda não disponível.'
            right={
              <button
                type='button'
                disabled
                className='inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium opacity-50'
              >
                Copiar link
              </button>
            }
          />

          <div className='mt-3'>
            <DisabledRow
              Icon={RiGlobalLine}
              title='Permissão padrão'
              tooltip='Permissão padrão para novos membros ainda não configurável.'
              right={
                <div className='flex h-7 cursor-not-allowed items-center gap-1 rounded-md px-2 text-xs opacity-60'>
                  <RiPencilLine
                    className='size-3.5 text-muted-foreground'
                    aria-hidden
                  />
                  <div>
                    <p className='font-medium'>Pode editar</p>
                    <p className='text-[10px] text-muted-foreground'>
                      Criar e editar conteúdo
                    </p>
                  </div>
                  <RiArrowDownSLine
                    className='size-4 opacity-50'
                    aria-hidden
                  />
                </div>
              }
            />
          </div>
        </div>

        <div className='h-px shrink-0 bg-border' />

        <div className='px-5 py-3'>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>
            Compartilhado com
          </p>
          <div className='flex items-center justify-between py-1.5'>
            <span className='text-xs text-muted-foreground'>
              {memberCount} Pessoa{memberCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className='max-h-56 overflow-y-auto px-5 pb-2'>
          {members.isLoading && (
            <p className='py-2 text-sm text-muted-foreground'>Carregando...</p>
          )}
          {!members.isLoading && memberCount === 0 && (
            <p className='py-2 text-sm text-muted-foreground'>
              {isPrivate
                ? 'Nenhum membro adicionado ainda.'
                : 'Sem membros diretos. Todos do workspace têm acesso herdado.'}
            </p>
          )}
          {(members.data ?? []).map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              onUpdate={(permission) =>
                updateMember.mutate({ userId: m.userId, permission })
              }
              onRemove={() => removeMember.mutate(m.userId)}
              isPending={updateMember.isPending || removeMember.isPending}
            />
          ))}
        </div>

        <div className='h-px shrink-0 bg-border' />

        <div className='px-5 py-3'>
          <button
            type='button'
            onClick={handleTogglePrivacy}
            disabled={setVisibility.isPending}
            className='inline-flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50'
          >
            {isPrivate ? (
              <>
                <RiLockUnlockLine className='size-4' aria-hidden />
                Tornar Público
              </>
            ) : (
              <>
                <RiLockLine className='size-4' aria-hidden />
                Tornar Privado
              </>
            )}
          </button>
        </div>

        <button
          type='button'
          onClick={() => onOpenChange(false)}
          aria-label='Fechar'
          className='absolute right-4 top-4 rounded opacity-70 transition-opacity hover:opacity-100'
        >
          <RiCloseLine className='size-4' aria-hidden />
        </button>
      </Modal.Content>
    </Modal.Root>
  );
}

function MemberRow({
  member,
  onUpdate,
  onRemove,
  isPending,
}: {
  member: ScopeMember;
  onUpdate: (permission: Permission) => void;
  onRemove: () => void;
  isPending: boolean;
}) {
  const labelInfo = PERMISSION_LABELS[member.permission];
  const Icon = labelInfo.Icon;
  return (
    <div className='group flex items-center gap-3 rounded-md px-1 py-2 hover:bg-muted/50'>
      <Initials
        seed={member.userId}
        label={initialsOf(member.user.name, member.user.email)}
      />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='truncate text-sm font-medium'>
            {member.user.name ?? member.user.email}
          </span>
          {member.inherited && (
            <span className='rounded bg-bg-weak-50 px-1.5 py-0.5 text-[10px] text-muted-foreground'>
              herdado
            </span>
          )}
        </div>
        <p className='truncate text-xs text-muted-foreground'>
          {member.user.email}
        </p>
      </div>
      <div className='flex items-center gap-1'>
        <div className='relative'>
          <select
            value={member.permission}
            onChange={(e) => onUpdate(e.target.value as Permission)}
            disabled={member.inherited || isPending}
            className='h-7 cursor-pointer appearance-none rounded-md border-0 bg-transparent pl-7 pr-6 text-xs disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent'
            aria-label='Permissão'
          >
            {PERMISSIONS.map((p) => (
              <option key={p} value={p}>
                {PERMISSION_LABELS[p].title}
              </option>
            ))}
          </select>
          <Icon
            className='pointer-events-none absolute left-1 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground'
            aria-hidden
          />
          <RiArrowDownSLine
            className='pointer-events-none absolute right-1 top-1/2 size-4 -translate-y-1/2 opacity-50'
            aria-hidden
          />
        </div>
        {!member.inherited && (
          <button
            type='button'
            onClick={onRemove}
            disabled={isPending}
            className='hidden rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 group-hover:block'
            aria-label='Remover membro'
          >
            <RiUserUnfollowLine className='size-3.5' aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

function DisabledRow({
  Icon,
  title,
  tooltip,
  right,
}: {
  Icon: typeof RiLinkM;
  title: string;
  tooltip: string;
  right: React.ReactNode;
}) {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2 text-sm'>
        <Icon className='size-4 text-muted-foreground' aria-hidden />
        <span className='font-medium'>{title}</span>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              tabIndex={-1}
              className='cursor-help text-muted-foreground'
              aria-label={tooltip}
            >
              <RiInformation2Line className='size-3.5' aria-hidden />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side='top'>{tooltip}</Tooltip.Content>
        </Tooltip.Root>
      </div>
      {right}
    </div>
  );
}

function Initials({ seed, label }: { seed: string; label: string }) {
  return (
    <span
      className='flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white'
      style={{ backgroundColor: colorFor(seed) }}
    >
      {label}
    </span>
  );
}
