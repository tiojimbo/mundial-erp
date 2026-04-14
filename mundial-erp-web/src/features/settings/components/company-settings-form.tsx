'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Button from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import { useCompany, useUpdateCompany } from '../hooks/use-company';
import { companySchema, type CompanyFormData } from '../schemas/company.schema';

export function CompanySettingsForm() {
  const { notification } = useNotification();
  const { data: company, isLoading } = useCompany();
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        tradeName: company.tradeName ?? '',
        cnpj: company.cnpj,
        ie: company.ie ?? '',
        im: company.im ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        website: company.website ?? '',
        address: company.address ?? '',
        addressNumber: company.addressNumber ?? '',
        neighborhood: company.neighborhood ?? '',
        complement: company.complement ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        zipCode: company.zipCode ?? '',
        description: company.description ?? '',
      });
    }
  }, [company, reset]);

  const descriptionValue = watch('description') ?? '';

  function onSubmit(data: CompanyFormData) {
    updateCompany.mutate(data, {
      onSuccess: () => {
        notification({ title: 'Sucesso', description: 'Dados da empresa atualizados.', status: 'success' });
      },
      onError: () => {
        notification({ title: 'Erro', description: 'Falha ao atualizar dados da empresa.', status: 'error' });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-paragraph-sm text-text-soft-400">Carregando...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      {/* Logo Upload Placeholder */}
      <div className="flex items-center gap-5">
        <div className="flex size-16 items-center justify-center rounded-full bg-bg-soft-200">
          <span className="text-label-lg text-text-soft-400">
            {company?.name?.charAt(0) ?? 'E'}
          </span>
        </div>
        <div>
          <p className="text-label-md text-text-strong-950">Logo da Empresa</p>
          <p className="text-paragraph-sm text-text-sub-600">
            Min 400x400px, PNG ou JPEG
          </p>
        </div>
      </div>

      <div className="h-px bg-stroke-soft-200" />

      {/* Form Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-label-sm text-text-strong-950">
            Nome da Empresa <span className="text-primary-base">*</span>
          </label>
          <input
            {...register('name')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
          {errors.name && (
            <p className="text-paragraph-xs text-error-base">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Nome Fantasia</label>
          <input
            {...register('tradeName')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">
            CNPJ <span className="text-primary-base">*</span>
          </label>
          <input
            {...register('cnpj')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
          {errors.cnpj && (
            <p className="text-paragraph-xs text-error-base">{errors.cnpj.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Inscrição Estadual</label>
          <input
            {...register('ie')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Inscrição Municipal</label>
          <input
            {...register('im')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Telefone</label>
          <input
            {...register('phone')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
          {errors.email && (
            <p className="text-paragraph-xs text-error-base">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-label-sm text-text-strong-950">Website</label>
          <input
            {...register('website')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>
      </div>

      <div className="h-px bg-stroke-soft-200" />

      {/* Address */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Endereço</label>
          <input
            {...register('address')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Número</label>
          <input
            {...register('addressNumber')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Bairro</label>
          <input
            {...register('neighborhood')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Complemento</label>
          <input
            {...register('complement')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-text-strong-950">Cidade</label>
          <input
            {...register('city')}
            className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">UF</label>
            <input
              {...register('state')}
              maxLength={2}
              className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-sm text-text-strong-950">CEP</label>
            <input
              {...register('zipCode')}
              className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-stroke-soft-200" />

      {/* Description */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <label className="text-label-sm text-text-strong-950">Descrição</label>
          <span className="text-paragraph-sm text-text-sub-600">(Opcional)</span>
        </div>
        <textarea
          {...register('description')}
          rows={3}
          maxLength={200}
          placeholder="Descreva brevemente a empresa..."
          className="w-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-3 py-2.5 text-paragraph-sm text-text-strong-950 shadow-xs placeholder:text-text-soft-400 focus:border-primary-base focus:outline-none focus:ring-1 focus:ring-primary-base"
        />
        <div className="flex items-center justify-end">
          <span className="text-subheading-2xs uppercase text-text-soft-400">
            {descriptionValue.length}/200
          </span>
        </div>
        {errors.description && (
          <p className="text-paragraph-xs text-error-base">{errors.description.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button.Root
          variant="neutral"
          mode="stroke"
          size="medium"
          type="button"
          onClick={() => reset()}
          disabled={!isDirty}
          className="flex-1"
        >
          Descartar
        </Button.Root>
        <Button.Root
          variant="primary"
          mode="filled"
          size="medium"
          type="submit"
          disabled={!isDirty || updateCompany.isPending}
          className="flex-1"
        >
          {updateCompany.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button.Root>
      </div>
    </form>
  );
}
