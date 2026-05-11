'use client';

import { useMemo, useState } from 'react';
import {
  Eye,
  Globe,
  Info,
  LayoutGrid,
  Link2,
  Lock,
  LockOpen,
  MessageSquare,
  PencilLine,
  Shield,
  UserMinus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import * as Modal from '@/components/ui/modal';
import * as Select from '@/components/ui/select';
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

type PermissionDef = {
  title: string;
  description: string;
  Icon: typeof PencilLine;
};

const PERMISSION_DEFS: Record<Permission, PermissionDef> = {
  VIEW: {
    title: 'Pode visualizar',
    description: 'Apenas leitura',
    Icon: Eye,
  },
  COMMENT: {
    title: 'Pode comentar',
    description: 'Ver e comentar',
    Icon: MessageSquare,
  },
  EDIT: {
    title: 'Pode editar',
    description: 'Criar e editar conteúdo',
    Icon: PencilLine,
  },
  FULL_EDIT: {
    title: 'Edição completa',
    description: 'Editar, excluir e gerenciar membros',
    Icon: Shield,
  },
};

const PERMISSIONS: Permission[] = ['VIEW', 'COMMENT', 'EDIT', 'FULL_EDIT'];

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
  const [defaultPermission, setDefaultPermission] =
    useState<Permission>('EDIT');

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
      { userId, permission: defaultPermission },
      { onSuccess: () => setSearch('') },
    );
  };

  const handleTogglePrivacy = () => {
    setVisibility.mutate(isPrivate ? 'PUBLIC' : 'PRIVATE');
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='gap-0 !p-0 sm:max-w-md' showClose={false}>
        {/* HEADER */}
        <div className='flex flex-col gap-0 px-5 pb-0 pt-5'>
          <h2 className='text-base font-semibold'>
            Compartilhar este {label}
          </h2>
          <div className='mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span>Compartilhando {label} com todas as views</span>
            <LayoutGrid className='size-3.5' aria-hidden />
            <span className='font-medium text-foreground'>{name}</span>
          </div>
        </div>

        {/* BUSCA */}
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
                    className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50'
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

        <Separator className='mt-4' />

        {/* LINK + PERMISSAO PADRAO */}
        <div className='px-5 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm'>
              <Link2 className='size-4 text-muted-foreground' aria-hidden />
              <span className='font-medium'>Link privado</span>
              <InfoTooltip>Apenas membros convidados acessam.</InfoTooltip>
            </div>
            <button
              type='button'
              onClick={handleCopyLink}
              className='inline-flex h-7 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-accent'
            >
              Copiar link
            </button>
          </div>

          <div className='mt-3 flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm'>
              <Globe className='size-4 text-muted-foreground' aria-hidden />
              <span className='font-medium'>Permissão padrão</span>
              <InfoTooltip>
                Permissão usada ao adicionar novos membros.
              </InfoTooltip>
            </div>
            <PermissionSelect
              value={defaultPermission}
              onChange={setDefaultPermission}
            />
          </div>
        </div>

        <Separator />

        {/* CONTADOR */}
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

        {/* LISTA */}
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
              onChange={(permission) =>
                updateMember.mutate({ userId: m.userId, permission })
              }
              onRemove={() => removeMember.mutate(m.userId)}
              isPending={updateMember.isPending || removeMember.isPending}
            />
          ))}
        </div>

        <Separator />

        {/* TORNAR PRIVADO/PUBLICO */}
        <div className='px-5 py-3'>
          <button
            type='button'
            onClick={handleTogglePrivacy}
            disabled={setVisibility.isPending}
            className='inline-flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50'
          >
            {isPrivate ? (
              <>
                <LockOpen className='size-4' aria-hidden />
                Tornar Público
              </>
            ) : (
              <>
                <Lock className='size-4' aria-hidden />
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
          <X className='size-4' aria-hidden />
        </button>
      </Modal.Content>
    </Modal.Root>
  );
}

function MemberRow({
  member,
  onChange,
  onRemove,
  isPending,
}: {
  member: ScopeMember;
  onChange: (permission: Permission) => void;
  onRemove: () => void;
  isPending: boolean;
}) {
  return (
    <div className='group flex items-center gap-3 rounded-md px-1 py-2 hover:bg-muted/50'>
      <Initials
        seed={member.userId}
        label={initialsOf(member.user.name, member.user.email)}
      />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='block truncate text-sm font-medium'>
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
        <PermissionSelect
          value={member.permission}
          onChange={onChange}
          disabled={member.inherited || isPending}
        />
        {!member.inherited && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type='button'
                onClick={onRemove}
                disabled={isPending}
                className='hidden rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 group-hover:block'
                aria-label='Remover membro'
              >
                <UserMinus className='size-3.5' aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side='top'>Remover membro</Tooltip.Content>
          </Tooltip.Root>
        )}
      </div>
    </div>
  );
}

function PermissionSelect({
  value,
  onChange,
  disabled,
}: {
  value: Permission;
  onChange: (next: Permission) => void;
  disabled?: boolean;
}) {
  const current = PERMISSION_DEFS[value];
  const CurrentIcon = current.Icon;
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onChange(v as Permission)}
      disabled={disabled}
    >
      <Select.Trigger
        className={cn(
          'h-7 w-auto gap-1 border-0 bg-transparent px-2 text-xs shadow-none ring-0',
          'hover:bg-transparent hover:ring-0 focus:shadow-none focus:ring-0',
        )}
      >
        <Select.Value>
          <span className='flex items-center gap-2'>
            <CurrentIcon
              className='size-3.5 text-muted-foreground'
              aria-hidden
            />
            <span className='flex flex-col items-start leading-tight'>
              <span className='text-xs font-medium'>{current.title}</span>
              <span className='text-[10px] text-muted-foreground'>
                {current.description}
              </span>
            </span>
          </span>
        </Select.Value>
      </Select.Trigger>
      <Select.Content align='end'>
        {PERMISSIONS.map((p) => {
          const def = PERMISSION_DEFS[p];
          const Icon = def.Icon;
          return (
            <Select.Item key={p} value={p}>
              <span className='flex items-center gap-2'>
                <Icon className='size-3.5 text-muted-foreground' aria-hidden />
                <span className='flex flex-col items-start leading-tight'>
                  <span className='text-xs font-medium'>{def.title}</span>
                  <span className='text-[10px] text-muted-foreground'>
                    {def.description}
                  </span>
                </span>
              </span>
            </Select.Item>
          );
        })}
      </Select.Content>
    </Select.Root>
  );
}

function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type='button'
          tabIndex={-1}
          aria-label='Informação'
          className='cursor-help text-muted-foreground'
        >
          <Info className='size-3.5' aria-hidden />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content side='top'>{children}</Tooltip.Content>
    </Tooltip.Root>
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

function Separator({ className }: { className?: string }) {
  return (
    <div
      role='none'
      className={cn('h-px w-full shrink-0 bg-border', className)}
    />
  );
}
