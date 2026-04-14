'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import { RiSaveLine } from '@remixicon/react';
import {
  dashboardSchema,
  type DashboardFormData,
} from '../schemas/dashboard.schema';

type DashboardFormProps = {
  defaultValues?: Partial<DashboardFormData>;
  onSubmit: (data: DashboardFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
};

export function DashboardForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Salvar',
}: DashboardFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DashboardFormData>({
    resolver: zodResolver(dashboardSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
      ...defaultValues,
    },
  });

  const isPublic = watch('isPublic');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
      {/* Name */}
      <div className='space-y-1.5'>
        <label className='text-label-sm text-text-strong-950'>
          Nome do Painel
        </label>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input
              placeholder='Ex: KPIs de Vendas'
              {...register('name')}
              hasError={!!errors.name}
            />
          </Input.Wrapper>
        </Input.Root>
        {errors.name && (
          <p className='text-paragraph-xs text-state-error-base'>
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className='space-y-1.5'>
        <label className='text-label-sm text-text-strong-950'>
          Descrição
        </label>
        <Input.Root>
          <Input.Wrapper>
            <Input.Input
              placeholder='Descrição opcional do painel'
              {...register('description')}
            />
          </Input.Wrapper>
        </Input.Root>
        {errors.description && (
          <p className='text-paragraph-xs text-state-error-base'>
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Public toggle */}
      <div className='flex items-center justify-between rounded-lg border border-stroke-soft-200 p-4'>
        <div>
          <p className='text-label-sm text-text-strong-950'>Painel público</p>
          <p className='text-paragraph-xs text-text-sub-600'>
            Visível para todos os usuários da organização.
          </p>
        </div>
        <Switch.Root
          checked={isPublic}
          onCheckedChange={(checked: boolean) => setValue('isPublic', checked)}
        />
      </div>

      {/* Submit */}
      <div className='flex justify-end'>
        <Button.Root
          type='submit'
          variant='primary'
          mode='filled'
          size='small'
          disabled={isLoading}
        >
          <Button.Icon as={RiSaveLine} />
          {isLoading ? 'Salvando...' : submitLabel}
        </Button.Root>
      </div>
    </form>
  );
}
