'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import * as Label from '@/components/ui/label';
import { requisitionSchema, type RequisitionFormData } from '../schemas/stock-requisition.schema';

type Props = {
  onSubmit: (data: RequisitionFormData) => void;
  isLoading?: boolean;
  products?: { id: string; name: string; code: string }[];
};

export function RequisitionForm({
  onSubmit,
  isLoading,
  products = [],
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      type: 'INTERNO',
      orderId: '',
      notes: '',
      items: [{ productId: '', requestedQuantity: 1, unitType: 'UN', unitsPerBox: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const selectedType = watch('type');
  const watchedItems = watch('items');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Nova Requisicao de Estoque</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Crie uma requisicao para saida de materiais do estoque
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link href='/compras/requisicoes'>
            <Button.Root variant='neutral' mode='stroke' size='small'>
              Cancelar
            </Button.Root>
          </Link>
          <Button.Root
            type='submit'
            variant='primary'
            mode='filled'
            size='small'
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : 'Criar Requisicao'}
          </Button.Root>
        </div>
      </div>

      {/* Type and Order */}
      <fieldset className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <legend className='text-label-md text-text-strong-950 px-2'>Dados da Requisicao</legend>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label.Root>Tipo *</Label.Root>
            <Controller
              name='type'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='Selecione o tipo' />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value='VENDA'>Venda (vinculada a pedido)</Select.Item>
                    <Select.Item value='INTERNO'>Interno (uso proprio)</Select.Item>
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors.type && <Hint.Root hasError>{errors.type.message}</Hint.Root>}
          </div>

          {selectedType === 'VENDA' && (
            <div className='space-y-1.5'>
              <Label.Root>Codigo do Pedido</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    placeholder='Ex: PED-20260401-001'
                    {...register('orderId')}
                  />
                </Input.Wrapper>
              </Input.Root>
              {errors.orderId && <Hint.Root hasError>{errors.orderId.message}</Hint.Root>}
            </div>
          )}
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <legend className='text-label-md text-text-strong-950 px-2'>Itens da Requisicao *</legend>
        <div className='flex flex-col gap-4'>
          {fields.map((field, index) => {
            const itemUnitType = watchedItems?.[index]?.unitType;
            return (
              <div key={field.id} className='flex flex-col gap-3 rounded-lg border border-stroke-soft-200 p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-label-sm text-text-sub-600'>Item {index + 1}</span>
                  {fields.length > 1 && (
                    <button type='button' onClick={() => remove(index)} className='text-state-error-base hover:opacity-70'>
                      <i className='ri-delete-bin-line' />
                    </button>
                  )}
                </div>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-5'>
                  <div className='space-y-1.5 md:col-span-2'>
                    <Label.Root>Produto *</Label.Root>
                    <Controller
                      name={`items.${index}.productId`}
                      control={control}
                      render={({ field: f }) => (
                        <Select.Root value={f.value || undefined} onValueChange={f.onChange}>
                          <Select.Trigger>
                            <Select.Value placeholder='Selecione o produto' />
                          </Select.Trigger>
                          <Select.Content>
                            {products.map((p) => (
                              <Select.Item key={p.id} value={p.id}>
                                {p.code} - {p.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {errors.items?.[index]?.productId && (
                      <Hint.Root hasError>{errors.items[index]?.productId?.message}</Hint.Root>
                    )}
                  </div>
                  <div className='space-y-1.5'>
                    <Label.Root>Quantidade *</Label.Root>
                    <Input.Root>
                      <Input.Wrapper>
                        <Input.Input
                          type='number'
                          min={1}
                          step='1'
                          {...register(`items.${index}.requestedQuantity`)}
                        />
                      </Input.Wrapper>
                    </Input.Root>
                    {errors.items?.[index]?.requestedQuantity && (
                      <Hint.Root hasError>{errors.items[index]?.requestedQuantity?.message}</Hint.Root>
                    )}
                  </div>
                  <div className='space-y-1.5'>
                    <Label.Root>Unidade *</Label.Root>
                    <Controller
                      name={`items.${index}.unitType`}
                      control={control}
                      render={({ field: f }) => (
                        <Select.Root value={f.value} onValueChange={f.onChange}>
                          <Select.Trigger>
                            <Select.Value placeholder='UN/CX' />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value='UN'>Unidade (UN)</Select.Item>
                            <Select.Item value='CX'>Caixa (CX)</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      )}
                    />
                    {errors.items?.[index]?.unitType && (
                      <Hint.Root hasError>{errors.items[index]?.unitType?.message}</Hint.Root>
                    )}
                  </div>
                  {itemUnitType === 'CX' && (
                    <div className='space-y-1.5'>
                      <Label.Root>UN/Caixa *</Label.Root>
                      <Input.Root>
                        <Input.Wrapper>
                          <Input.Input
                            type='number'
                            min={1}
                            step='1'
                            placeholder='Ex: 1000'
                            {...register(`items.${index}.unitsPerBox`)}
                          />
                        </Input.Wrapper>
                      </Input.Root>
                      {errors.items?.[index]?.unitsPerBox && (
                        <Hint.Root hasError>{errors.items[index]?.unitsPerBox?.message}</Hint.Root>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {errors.items?.root && <Hint.Root hasError>{errors.items.root.message}</Hint.Root>}
          {errors.items?.message && <Hint.Root hasError>{errors.items.message}</Hint.Root>}

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => append({ productId: '', requestedQuantity: 1, unitType: 'UN', unitsPerBox: undefined })}
          >
            <Button.Icon as='i' className='ri-add-line' />
            Adicionar Item
          </Button.Root>
        </div>
      </fieldset>

      {/* Notes */}
      <fieldset className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <legend className='text-label-md text-text-strong-950 px-2'>Observacoes</legend>
        <textarea
          {...register('notes')}
          rows={4}
          className='w-full rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm focus:border-primary-base focus:outline-none'
          placeholder='Observacoes sobre a requisicao...'
        />
      </fieldset>
    </form>
  );
}
