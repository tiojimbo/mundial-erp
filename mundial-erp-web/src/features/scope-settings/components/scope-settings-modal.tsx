'use client';

import { useState } from 'react';
import * as Modal from '@/components/ui/modal';
import { cn } from '@/lib/cn';
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
import { useScopeResources } from '../hooks/use-scope-resources';
import {
  SCOPE_LABEL,
  type Permission,
  type ScopeKind,
  type Visibility,
} from '../types/scope.types';

const PERMISSIONS: Array<{ value: Permission; label: string }> = [
  { value: 'FULL_EDIT', label: 'Acesso total' },
  { value: 'EDIT', label: 'Pode editar' },
  { value: 'COMMENT', label: 'Pode comentar' },
  { value: 'VIEW', label: 'Pode ver' },
];

type Tab = 'visibility' | 'members' | 'resources';

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
  const [tab, setTab] = useState<Tab>('visibility');

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content className='max-w-2xl'>
        <Modal.Header
          title={`Configurar ${SCOPE_LABEL[scope]}`}
          description={name}
        />
        <div className='border-b border-border px-4'>
          <div className='flex gap-1'>
            <TabButton
              active={tab === 'visibility'}
              onClick={() => setTab('visibility')}
            >
              Visibilidade
            </TabButton>
            <TabButton
              active={tab === 'members'}
              onClick={() => setTab('members')}
            >
              Membros
            </TabButton>
            <TabButton
              active={tab === 'resources'}
              onClick={() => setTab('resources')}
            >
              Filtros
            </TabButton>
          </div>
        </div>
        <div className='max-h-[60vh] overflow-y-auto p-4'>
          {tab === 'visibility' && <VisibilitySection scope={scope} id={id} />}
          {tab === 'members' && <MembersSection scope={scope} id={id} />}
          {tab === 'resources' && <ResourcesSection scope={scope} id={id} />}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function VisibilitySection({ scope, id }: { scope: ScopeKind; id: string }) {
  const visibility = useScopeVisibility(scope, id);
  const setVisibility = useSetScopeVisibility(scope, id);

  if (visibility.isLoading) {
    return <p className='text-sm text-muted-foreground'>Carregando...</p>;
  }
  if (visibility.isError) {
    return (
      <p className='text-sm text-destructive'>
        Falha ao carregar visibilidade.
      </p>
    );
  }

  const current: Visibility = visibility.data?.visibility ?? 'PUBLIC';

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted-foreground'>
        Defina se este {SCOPE_LABEL[scope].toLowerCase()} fica visível para todo
        o workspace ou apenas para membros adicionados.
      </p>
      <div className='space-y-2'>
        <VisibilityOption
          value='PUBLIC'
          current={current}
          label='Público'
          description='Todos os membros do workspace podem ver.'
          onSelect={() => setVisibility.mutate('PUBLIC')}
          disabled={setVisibility.isPending}
        />
        <VisibilityOption
          value='PRIVATE'
          current={current}
          label='Privado'
          description='Apenas membros adicionados explicitamente.'
          onSelect={() => setVisibility.mutate('PRIVATE')}
          disabled={setVisibility.isPending}
        />
      </div>
    </div>
  );
}

function VisibilityOption({
  value,
  current,
  label,
  description,
  onSelect,
  disabled,
}: {
  value: Visibility;
  current: Visibility;
  label: string;
  description: string;
  onSelect: () => void;
  disabled: boolean;
}) {
  const active = value === current;
  return (
    <button
      type='button'
      onClick={onSelect}
      disabled={disabled || active}
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-bg-weak-50',
        disabled && 'opacity-60',
      )}
    >
      <span className='text-sm font-medium'>{label}</span>
      <span className='text-xs text-muted-foreground'>{description}</span>
    </button>
  );
}

function MembersSection({ scope, id }: { scope: ScopeKind; id: string }) {
  const members = useScopeMembers(scope, id);
  const addMember = useAddScopeMember(scope, id);
  const updateMember = useUpdateScopeMember(scope, id);
  const removeMember = useRemoveScopeMember(scope, id);

  const [newUserId, setNewUserId] = useState('');
  const [newPermission, setNewPermission] = useState<Permission>('EDIT');

  const handleAdd = () => {
    if (!newUserId.trim()) return;
    addMember.mutate(
      { userId: newUserId.trim(), permission: newPermission },
      {
        onSuccess: () => setNewUserId(''),
      },
    );
  };

  if (members.isLoading) {
    return <p className='text-sm text-muted-foreground'>Carregando...</p>;
  }

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <h4 className='text-xs font-semibold uppercase text-muted-foreground'>
          Adicionar membro
        </h4>
        <div className='flex gap-2'>
          <input
            type='text'
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder='User ID'
            className='h-9 flex-1 rounded-md border border-border bg-bg-white-0 px-3 text-sm'
          />
          <select
            value={newPermission}
            onChange={(e) => setNewPermission(e.target.value as Permission)}
            className='h-9 rounded-md border border-border bg-bg-white-0 px-2 text-sm'
          >
            {PERMISSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type='button'
            onClick={handleAdd}
            disabled={!newUserId.trim() || addMember.isPending}
            className='h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50'
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className='space-y-2'>
        <h4 className='text-xs font-semibold uppercase text-muted-foreground'>
          Membros ({members.data?.length ?? 0})
        </h4>
        {(members.data ?? []).length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            Ainda não há membros diretos. Em modo público, todos do workspace
            têm acesso herdado.
          </p>
        ) : (
          <ul className='space-y-1'>
            {(members.data ?? []).map((m) => (
              <li
                key={m.userId}
                className='flex items-center justify-between gap-2 rounded-md border border-border bg-bg-white-0 p-2'
              >
                <div className='flex min-w-0 flex-1 flex-col'>
                  <span className='truncate text-sm font-medium'>
                    {m.user.name ?? m.user.email}
                  </span>
                  <span className='truncate text-xs text-muted-foreground'>
                    {m.user.email}
                    {m.inherited ? ' • herdado' : ''}
                  </span>
                </div>
                <select
                  value={m.permission}
                  onChange={(e) =>
                    updateMember.mutate({
                      userId: m.userId,
                      permission: e.target.value as Permission,
                    })
                  }
                  disabled={m.inherited || updateMember.isPending}
                  className='h-8 rounded-md border border-border bg-bg-white-0 px-2 text-xs'
                >
                  {PERMISSIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  onClick={() => removeMember.mutate(m.userId)}
                  disabled={m.inherited || removeMember.isPending}
                  className='h-8 rounded-md px-2 text-xs text-error-base hover:bg-error-lighter disabled:opacity-40'
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResourcesSection({ scope, id }: { scope: ScopeKind; id: string }) {
  const resources = useScopeResources(scope, id);

  if (resources.isLoading) {
    return <p className='text-sm text-muted-foreground'>Carregando...</p>;
  }
  if (resources.isError || !resources.data) {
    return (
      <p className='text-sm text-destructive'>Falha ao carregar metadata.</p>
    );
  }

  return (
    <div className='space-y-4 text-sm'>
      <p className='text-muted-foreground'>
        Metadata de filtros e ordenação disponíveis neste nível (read-only,
        documentação para o front-end).
      </p>
      <div>
        <h4 className='mb-2 text-xs font-semibold uppercase text-muted-foreground'>
          Filtros disponíveis
        </h4>
        <ul className='space-y-1'>
          {resources.data.filters.map((f) => (
            <li
              key={f.field}
              className='rounded-md border border-border bg-bg-white-0 p-2'
            >
              <span className='font-medium'>{f.label}</span>
              <span className='text-xs text-muted-foreground'>
                {' '}
                ({f.field}) — operadores: {f.operators.join(', ')}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className='mb-2 text-xs font-semibold uppercase text-muted-foreground'>
          Ordenação disponível
        </h4>
        <ul className='space-y-1'>
          {resources.data.sortOptions.map((s) => (
            <li
              key={s.field}
              className='rounded-md border border-border bg-bg-white-0 p-2'
            >
              <span className='font-medium'>{s.label}</span>
              <span className='text-xs text-muted-foreground'> ({s.field})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
