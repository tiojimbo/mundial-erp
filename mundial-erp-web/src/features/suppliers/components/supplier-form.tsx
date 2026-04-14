'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { RiArrowLeftLine, RiLoader4Line } from '@remixicon/react';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Hint from '@/components/ui/hint';
import * as Button from '@/components/ui/button';
import * as Select from '@/components/ui/select';
import * as Switch from '@/components/ui/switch';
import { supplierSchema, type SupplierFormData } from '../schemas/supplier.schema';
import type { Supplier } from '../types/supplier.types';

type SupplierFormProps = {
  defaultValues?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  isLoading: boolean;
  title: string;
};

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export function SupplierForm({
  defaultValues,
  onSubmit,
  isLoading,
  title,
}: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues
      ? {
          personType: defaultValues.personType,
          cpfCnpj: defaultValues.cpfCnpj,
          name: defaultValues.name,
          tradeName: defaultValues.tradeName ?? '',
          ie: defaultValues.ie ?? '',
          email: defaultValues.email ?? '',
          phone: defaultValues.phone ?? '',
          address: defaultValues.address ?? '',
          city: defaultValues.city ?? '',
          state: defaultValues.state ?? '',
          zipCode: defaultValues.zipCode ?? '',
          isActive: defaultValues.isActive,
        }
      : {
          personType: 'J',
          cpfCnpj: '',
          name: '',
          tradeName: '',
          ie: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          isActive: true,
        },
  });

  const personType = watch('personType');

  useEffect(() => {
    if (!defaultValues) {
      setValue('cpfCnpj', '');
    }
  }, [personType, defaultValues, setValue]);

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
          <Link href='/compras/fornecedores'>
            <Button.Icon as={RiArrowLeftLine} />
          </Link>
        </Button.Root>
        <h1 className='text-title-h5 text-text-strong-950'>{title}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* Dados Principais */}
        <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <legend className='px-2 text-label-md text-text-strong-950'>
            Dados Principais
          </legend>

          {/* Tipo Pessoa */}
          <div className='space-y-1.5'>
            <Label.Root>
              Tipo de Pessoa <Label.Asterisk />
            </Label.Root>
            <Controller
              name='personType'
              control={control}
              render={({ field }) => (
                <div className='flex gap-3'>
                  {(['F', 'J'] as const).map((type) => (
                    <button
                      key={type}
                      type='button'
                      onClick={() => field.onChange(type)}
                      className={`rounded-lg px-4 py-2 text-label-sm transition ${
                        field.value === type
                          ? 'bg-primary-base text-static-white'
                          : 'bg-bg-weak-50 text-text-sub-600 hover:bg-bg-soft-200'
                      }`}
                    >
                      {type === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* CPF/CNPJ */}
          <div className='space-y-1.5'>
            <Label.Root htmlFor='cpfCnpj'>
              {personType === 'F' ? 'CPF' : 'CNPJ'} <Label.Asterisk />
            </Label.Root>
            <Input.Root hasError={!!errors.cpfCnpj}>
              <Input.Wrapper>
                <Input.Input
                  id='cpfCnpj'
                  placeholder={
                    personType === 'F' ? '000.000.000-00' : '00.000.000/0000-00'
                  }
                  {...register('cpfCnpj')}
                />
              </Input.Wrapper>
            </Input.Root>
            {errors.cpfCnpj && (
              <Hint.Root hasError>{errors.cpfCnpj.message}</Hint.Root>
            )}
          </div>

          {/* Nome */}
          <div className='space-y-1.5'>
            <Label.Root htmlFor='name'>
              {personType === 'F' ? 'Nome Completo' : 'Razão Social'}{' '}
              <Label.Asterisk />
            </Label.Root>
            <Input.Root hasError={!!errors.name}>
              <Input.Wrapper>
                <Input.Input
                  id='name'
                  placeholder={
                    personType === 'F'
                      ? 'Nome completo do fornecedor'
                      : 'Razão social da empresa'
                  }
                  {...register('name')}
                />
              </Input.Wrapper>
            </Input.Root>
            {errors.name && (
              <Hint.Root hasError>{errors.name.message}</Hint.Root>
            )}
          </div>

          {/* Nome Fantasia */}
          <div className='space-y-1.5'>
            <Label.Root htmlFor='tradeName'>
              {personType === 'F' ? 'Apelido' : 'Nome Fantasia'}
            </Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input
                  id='tradeName'
                  placeholder={
                    personType === 'F' ? 'Apelido (opcional)' : 'Nome fantasia'
                  }
                  {...register('tradeName')}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* IE */}
          {personType === 'J' && (
            <div className='space-y-1.5'>
              <Label.Root htmlFor='ie'>Inscrição Estadual</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='ie'
                    placeholder='Inscrição estadual'
                    {...register('ie')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          )}
        </fieldset>

        {/* Contato */}
        <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <legend className='px-2 text-label-md text-text-strong-950'>
            Contato
          </legend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label.Root htmlFor='email'>E-mail</Label.Root>
              <Input.Root hasError={!!errors.email}>
                <Input.Wrapper>
                  <Input.Input
                    id='email'
                    type='email'
                    placeholder='email@exemplo.com'
                    {...register('email')}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.email && (
                <Hint.Root hasError>{errors.email.message}</Hint.Root>
              )}
            </div>
            <div className='space-y-1.5'>
              <Label.Root htmlFor='phone'>Telefone</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='phone'
                    placeholder='(00) 00000-0000'
                    {...register('phone')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>
        </fieldset>

        {/* Endereço */}
        <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <legend className='px-2 text-label-md text-text-strong-950'>
            Endereço
          </legend>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div className='space-y-1.5 sm:col-span-1'>
              <Label.Root htmlFor='zipCode'>CEP</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='zipCode'
                    placeholder='00000-000'
                    {...register('zipCode')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='address'>Logradouro</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input
                  id='address'
                  placeholder='Rua, Avenida, etc.'
                  {...register('address')}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label.Root htmlFor='city'>Cidade</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='city'
                    placeholder='Cidade'
                    {...register('city')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
            <div className='space-y-1.5'>
              <Label.Root>UF</Label.Root>
              <Controller
                name='state'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder='Selecione' />
                    </Select.Trigger>
                    <Select.Content>
                      {STATES.map((s) => (
                        <Select.Item key={s} value={s}>
                          {s}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
            </div>
          </div>
        </fieldset>

        {/* Status */}
        <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <legend className='px-2 text-label-md text-text-strong-950'>
            Status
          </legend>
          <div className='flex items-center gap-3'>
            <Controller
              name='isActive'
              control={control}
              render={({ field }) => (
                <Switch.Root
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label.Root>Fornecedor ativo</Label.Root>
          </div>
        </fieldset>

        {/* Actions */}
        <div className='flex items-center justify-end gap-3'>
          <Button.Root asChild variant='neutral' mode='stroke' size='medium'>
            <Link href='/compras/fornecedores'>Cancelar</Link>
          </Button.Root>
          <Button.Root
            type='submit'
            variant='primary'
            mode='filled'
            size='medium'
            disabled={isLoading}
          >
            {isLoading && (
              <RiLoader4Line className='size-5 animate-spin' />
            )}
            {defaultValues ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
          </Button.Root>
        </div>
      </form>
    </div>
  );
}
