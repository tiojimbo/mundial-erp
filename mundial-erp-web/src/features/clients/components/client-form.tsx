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
import { clientSchema, type ClientFormData } from '../schemas/client.schema';
import { useClientClassifications, useDeliveryRoutes } from '../hooks/use-clients';
import type { Client } from '../types/client.types';

type ClientFormProps = {
  defaultValues?: Client;
  onSubmit: (data: ClientFormData) => void;
  isLoading: boolean;
  title: string;
};

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export function ClientForm({
  defaultValues,
  onSubmit,
  isLoading,
  title,
}: ClientFormProps) {
  const { data: classifications } = useClientClassifications();
  const { data: deliveryRoutes } = useDeliveryRoutes();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues
      ? {
          personType: defaultValues.personType,
          cpfCnpj: defaultValues.cpfCnpj,
          name: defaultValues.name,
          tradeName: defaultValues.tradeName ?? '',
          ie: defaultValues.ie ?? '',
          rg: defaultValues.rg ?? '',
          email: defaultValues.email ?? '',
          phone: defaultValues.phone ?? '',
          address: defaultValues.address ?? '',
          addressNumber: defaultValues.addressNumber ?? '',
          neighborhood: defaultValues.neighborhood ?? '',
          complement: defaultValues.complement ?? '',
          city: defaultValues.city ?? '',
          state: defaultValues.state ?? '',
          zipCode: defaultValues.zipCode ?? '',
          classificationId: defaultValues.classificationId ?? '',
          deliveryRouteId: defaultValues.deliveryRouteId ?? '',
          defaultPriceTableId: defaultValues.defaultPriceTableId ?? '',
          defaultPaymentMethodId: defaultValues.defaultPaymentMethodId ?? '',
        }
      : {
          personType: 'F',
          cpfCnpj: '',
          name: '',
          tradeName: '',
          ie: '',
          rg: '',
          email: '',
          phone: '',
          address: '',
          addressNumber: '',
          neighborhood: '',
          complement: '',
          city: '',
          state: '',
          zipCode: '',
          classificationId: '',
          deliveryRouteId: '',
          defaultPriceTableId: '',
          defaultPaymentMethodId: '',
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
          <Link href='/comercial/clientes'>
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
                      ? 'Nome completo do cliente'
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

          {/* Nome Fantasia / Apelido */}
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

          {/* IE / RG */}
          <div className='grid gap-4 sm:grid-cols-2'>
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
            {personType === 'F' && (
              <div className='space-y-1.5'>
                <Label.Root htmlFor='rg'>RG</Label.Root>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      id='rg'
                      placeholder='RG'
                      {...register('rg')}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            )}
          </div>
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
          <div className='grid gap-4 sm:grid-cols-3'>
            <div className='space-y-1.5 sm:col-span-2'>
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
            <div className='space-y-1.5'>
              <Label.Root htmlFor='addressNumber'>Número</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='addressNumber'
                    placeholder='Nº'
                    {...register('addressNumber')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label.Root htmlFor='neighborhood'>Bairro</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='neighborhood'
                    placeholder='Bairro'
                    {...register('neighborhood')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
            <div className='space-y-1.5'>
              <Label.Root htmlFor='complement'>Complemento</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='complement'
                    placeholder='Apto, Sala, etc.'
                    {...register('complement')}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
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

        {/* Classificação */}
        <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
          <legend className='px-2 text-label-md text-text-strong-950'>
            Classificação
          </legend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label.Root>Classificação do Cliente</Label.Root>
              <Controller
                name='classificationId'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder='Nenhuma' />
                    </Select.Trigger>
                    <Select.Content>
                      {classifications?.map((c) => (
                        <Select.Item key={c.id} value={c.id}>
                          {c.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
            </div>
            <div className='space-y-1.5'>
              <Label.Root>Rota de Entrega</Label.Root>
              <Controller
                name='deliveryRouteId'
                control={control}
                render={({ field }) => (
                  <Select.Root
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder='Nenhuma' />
                    </Select.Trigger>
                    <Select.Content>
                      {deliveryRoutes?.map((r) => (
                        <Select.Item key={r.id} value={r.id}>
                          {r.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              />
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className='flex items-center justify-end gap-3'>
          <Button.Root asChild variant='neutral' mode='stroke' size='medium'>
            <Link href='/comercial/clientes'>Cancelar</Link>
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
            {defaultValues ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button.Root>
        </div>
      </form>
    </div>
  );
}
