'use client';

import { useState } from 'react';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiSearchLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Pagination from '@/components/ui/pagination';
import * as Modal from '@/components/ui/modal';

import { useNotification } from '@/hooks/use-notification';
import { useDebounce } from '@/hooks/use-debounce';
import { useUsers, useDeleteUser } from '../hooks/use-users';
import { UserFormModal } from './user-form-modal';
import {
  USER_ROLE_LABELS,
  DEPARTMENT_LABELS,
  type User,
  type UserFilters,
  type UserRole,
  type Department,
} from '../types/settings.types';

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

function getRoleBadgeColor(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'purple' as const;
    case 'MANAGER':
      return 'blue' as const;
    case 'OPERATOR':
      return 'green' as const;
    case 'VIEWER':
      return 'gray' as const;
  }
}

export function UsersTable() {
  const { notification } = useNotification();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [deptFilter, setDeptFilter] = useState<Department | ''>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const deleteUser = useDeleteUser();

  const filters: UserFilters = {
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    department: deptFilter || undefined,
  };

  const { data, isLoading } = useUsers(filters);
  const users = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  function handleDelete() {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        notification({ title: 'Sucesso', description: 'Usuário removido.', status: 'success' });
        setDeleteTarget(null);
      },
      onError: () => {
        notification({ title: 'Erro', description: 'Falha ao remover usuário.', status: 'error' });
      },
    });
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-label-lg text-text-strong-950">Usuários</h1>
            <p className="text-paragraph-sm text-text-sub-600">
              Gerencie os usuários e permissões do sistema.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button.Root
              variant="primary"
              mode="filled"
              size="small"
              onClick={() => setIsCreateOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Novo Usuário
            </Button.Root>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-soft-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar usuários..."
              className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-9 pr-3 text-paragraph-sm shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole | ''); setPage(1); }}
            className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
          >
            <option value="">Todos os perfis</option>
            {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value as Department | ''); setPage(1); }}
            className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm shadow-xs"
          >
            <option value="">Todos os departamentos</option>
            {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Body */}
        <div className="overflow-hidden rounded-xl border border-stroke-soft-200">
          {isLoading ? (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Nome</Table.Head>
                  <Table.Head>Email</Table.Head>
                  <Table.Head>Perfil</Table.Head>
                  <Table.Head>Departamento</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="w-24">Acoes</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Table.Row key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <Table.Cell key={j}>
                        <div className="h-4 w-24 animate-pulse rounded bg-bg-weak-50" />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          ) : users.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-paragraph-sm text-text-soft-400">Nenhum usuario encontrado.</p>
            </div>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Nome</Table.Head>
                  <Table.Head>Email</Table.Head>
                  <Table.Head>Perfil</Table.Head>
                  <Table.Head>Departamento</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="w-24">Ações</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((user) => (
                  <Table.Row key={user.id}>
                    <Table.Cell className="text-label-sm text-text-strong-950">
                      {user.name}
                    </Table.Cell>
                    <Table.Cell className="text-paragraph-sm text-text-sub-600">
                      {user.email}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge.Root
                        variant="lighter"
                        size="small"
                        color={getRoleBadgeColor(user.role)}
                      >
                        {USER_ROLE_LABELS[user.role]}
                      </Badge.Root>
                    </Table.Cell>
                    <Table.Cell className="text-paragraph-sm text-text-sub-600">
                      {DEPARTMENT_LABELS[user.department]}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge.Root
                        variant="lighter"
                        size="small"
                        color={user.isActive ? 'green' : 'gray'}
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </Badge.Root>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="rounded-md p-1.5 text-text-sub-600 hover:bg-bg-weak-50"
                        >
                          <RiEditLine className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="rounded-md p-1.5 text-text-sub-600 hover:bg-error-lighter hover:text-error-base"
                        >
                          <RiDeleteBinLine className="size-4" />
                        </button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </div>

        {/* Footer — Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-end">
            <Pagination.Root>
              <Pagination.NavButton
                onClick={() => setPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
              >
                <Pagination.NavIcon as={RiArrowLeftSLine} />
              </Pagination.NavButton>
              {getPageNumbers(pagination.page, pagination.totalPages).map(
                (p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-text-soft-400">...</span>
                  ) : (
                    <Pagination.Item
                      key={p}
                      current={p === pagination.page}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Pagination.Item>
                  ),
              )}
              <Pagination.NavButton
                onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                <Pagination.NavIcon as={RiArrowRightSLine} />
              </Pagination.NavButton>
            </Pagination.Root>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreateOpen || editingUser) && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>Remover Usuário</Modal.Title>
              <Modal.Description>
                Tem certeza que deseja remover <strong>{deleteTarget.name}</strong>? Esta ação não pode ser desfeita.
              </Modal.Description>
            </Modal.Header>
            <Modal.Footer>
              <Button.Root
                variant="neutral"
                mode="stroke"
                size="small"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button.Root>
              <Button.Root
                variant="error"
                mode="filled"
                size="small"
                onClick={handleDelete}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? 'Removendo...' : 'Remover'}
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </>
  );
}
