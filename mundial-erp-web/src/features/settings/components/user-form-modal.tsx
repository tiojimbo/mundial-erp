'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import { useCreateUser, useUpdateUser } from '../hooks/use-users';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '../schemas/user.schema';
import {
  USER_ROLE_LABELS,
  DEPARTMENT_LABELS,
  type User,
} from '../types/settings.types';

type UserFormModalProps = {
  user: User | null;
  onClose: () => void;
};

export function UserFormModal({ user, onClose }: UserFormModalProps) {
  const isEditing = !!user;
  const { notification } = useNotification();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(user?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: isEditing
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        }
      : {},
  });

  function onSubmit(data: UpdateUserFormData) {
    if (isEditing) {
      updateUser.mutate(data, {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Usuário atualizado.', status: 'success' });
          onClose();
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao atualizar usuário.', status: 'error' });
        },
      });
    } else {
      createUser.mutate(data as CreateUserFormData, {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Usuário criado.', status: 'success' });
          onClose();
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao criar usuário.', status: 'error' });
        },
      });
    }
  }

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</Modal.Title>
          <Modal.Description>
            {isEditing
              ? 'Atualize as informações do usuário.'
              : 'Preencha os dados para criar um novo usuário.'}
          </Modal.Description>
        </Modal.Header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Nome <span className="text-primary-base">*</span>
            </label>
            <input
              {...register('name')}
              className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
            />
            {errors.name && (
              <p className="text-paragraph-xs text-error-base">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Email <span className="text-primary-base">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
            />
            {errors.email && (
              <p className="text-paragraph-xs text-error-base">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">
              Senha {!isEditing && <span className="text-primary-base">*</span>}
              {isEditing && <span className="text-paragraph-xs text-text-sub-600"> (deixe vazio para manter)</span>}
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
            />
            {errors.password && (
              <p className="text-paragraph-xs text-error-base">{errors.password.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-label-sm text-text-strong-950">
                Perfil <span className="text-primary-base">*</span>
              </label>
              <select
                {...register('role')}
                className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm shadow-xs focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
              >
                <option value="">Selecione...</option>
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.role && (
                <p className="text-paragraph-xs text-error-base">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-label-sm text-text-strong-950">
                Departamento <span className="text-primary-base">*</span>
              </label>
              <select
                {...register('department')}
                className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm shadow-xs focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
              >
                <option value="">Selecione...</option>
                {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.department && (
                <p className="text-paragraph-xs text-error-base">{errors.department.message}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                {...register('isActive')}
                type="checkbox"
                id="isActive"
                className="size-4 rounded border-stroke-soft-200 text-primary-base focus:ring-primary-base"
              />
              <label htmlFor="isActive" className="text-label-sm text-text-strong-950">
                Usuário ativo
              </label>
            </div>
          )}

          <Modal.Footer>
            <Button.Root
              variant="neutral"
              mode="stroke"
              size="small"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant="primary"
              mode="filled"
              size="small"
              type="submit"
              disabled={isPending}
            >
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
