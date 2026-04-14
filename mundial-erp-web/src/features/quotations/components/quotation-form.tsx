'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { RiArrowLeftLine, RiAddLine, RiDeleteBinLine, RiLoader4Line } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Hint from '@/components/ui/hint';
import * as Label from '@/components/ui/label';
import { quotationSchema, type QuotationFormData } from '../schemas/quotation.schema';

type Props = {
  onSubmit: (data: QuotationFormData) => void;
  isLoading?: boolean;
  suppliers?: { id: string; name: string }[];
  products?: { id: string; name: string; code: string }[];
};

export function QuotationForm({
  onSubmit,
  isLoading,
  suppliers = [],
  products = [],
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      supplierId: '',
      notes: '',
      items: [{ productId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='mx-auto max-w-3xl space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-3'>
        <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
          <Link href='/compras/cotacoes'>
            <Button.Icon as={RiArrowLeftLine} />
          </Link>
        </Button.Root>
        <h1 className='text-title-h5 text-text-strong-950'>Nova Cotação</h1>
      </div>

      {/* Supplier selection */}
      <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <legend className='px-2 text-label-md text-text-strong-950'>Fornecedor</legend>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label.Root>Fornecedor *</Label.Root>
            <Controller
              name='supplierId'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='Selecione o fornecedor' />
                  </Select.Trigger>
                  <Select.Content>
                    {suppliers.map((s) => (
                      <Select.Item key={s.id} value={s.id}>{s.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors.supplierId && <Hint.Root hasError>{errors.supplierId.message}</Hint.Root>}
          </div>
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <legend className='px-2 text-label-md text-text-strong-950'>Itens da Cotação *</legend>
        <div className='flex flex-col gap-4'>
          {fields.map((field, index) => (
            <div key={field.id} className='flex flex-col gap-3 rounded-lg border border-stroke-soft-200 p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-label-sm text-text-sub-600'>Item {index + 1}</span>
                {fields.length > 1 && (
                  <Button.Root
                    variant='error'
                    mode='ghost'
                    size='xxsmall'
                    onClick={() => remove(index)}
                  >
                    <Button.Icon as={RiDeleteBinLine} />
                  </Button.Root>
                )}
              </div>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
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
                        {...register(`items.${index}.quantity`)}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                  {errors.items?.[index]?.quantity && (
                    <Hint.Root hasError>{errors.items[index]?.quantity?.message}</Hint.Root>
                  )}
                </div>
              </div>
            </div>
          ))}

          {errors.items?.root && <Hint.Root hasError>{errors.items.root.message}</Hint.Root>}
          {errors.items?.message && <Hint.Root hasError>{errors.items.message}</Hint.Root>}

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => append({ productId: '', quantity: 1 })}
          >
            <Button.Icon as={RiAddLine} />
            Adicionar Item
          </Button.Root>
        </div>
      </fieldset>

      {/* Notes */}
      <fieldset className='space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
        <legend className='px-2 text-label-md text-text-strong-950'>Observações</legend>
        <textarea
          {...register('notes')}
          rows={4}
          className='w-full rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm focus:border-primary-base focus:outline-none'
          placeholder='Observações sobre a cotação...'
        />
      </fieldset>

      {/* Actions */}
      <div className='flex items-center justify-end gap-3'>
        <Button.Root asChild variant='neutral' mode='stroke' size='medium'>
          <Link href='/compras/cotacoes'>Cancelar</Link>
        </Button.Root>
        <Button.Root
          type='submit'
          variant='primary'
          mode='filled'
          size='medium'
          disabled={isLoading}
        >
          {isLoading && <RiLoader4Line className='size-5 animate-spin' />}
          Criar Cotação
        </Button.Root>
      </div>
    </form>
  );
}
