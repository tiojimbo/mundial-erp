'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import * as Switch from '@/components/ui/switch';
import * as Hint from '@/components/ui/hint';
import * as Label from '@/components/ui/label';
import { orderSchema, type OrderFormData } from '../schemas/order.schema';
import type { CreateOrderPayload } from '../types/order.types';

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

type Props = {
  onSubmit: (data: CreateOrderPayload) => void;
  isSubmitting?: boolean;
  clients?: { id: string; name: string }[];
  paymentMethods?: { id: string; name: string }[];
  carriers?: { id: string; name: string }[];
  priceTables?: { id: string; name: string }[];
  products?: { id: string; name: string; code: string; priceCents?: number }[];
};

function ItemSuppliesField({
  nestIndex,
  control,
  register,
}: {
  nestIndex: number;
  control: ReturnType<typeof useForm<OrderFormData>>['control'];
  register: ReturnType<typeof useForm<OrderFormData>>['register'];
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${nestIndex}.supplies`,
  });

  return (
    <div className='mt-2 rounded-lg bg-bg-weak-50 p-3'>
      <div className='mb-2 flex items-center justify-between'>
        <span className='text-subheading-2xs uppercase text-text-soft-400'>
          Insumos / Acabamentos
        </span>
        <Button.Root
          type='button'
          variant='neutral'
          mode='ghost'
          size='xxsmall'
          onClick={() => append({ name: '', quantity: 1 })}
        >
          <Button.Icon as='i' className='ri-add-line' />
          Adicionar
        </Button.Root>
      </div>
      {fields.length === 0 && (
        <p className='text-paragraph-xs text-text-soft-400'>
          Nenhum insumo adicionado
        </p>
      )}
      {fields.map((supply, sIdx) => (
        <div key={supply.id} className='mb-1.5 flex items-center gap-2'>
          <Input.Root className='flex-1'>
            <Input.Wrapper>
              <Input.Input
                placeholder='Nome (ex: Acabamento frontal)'
                {...register(`items.${nestIndex}.supplies.${sIdx}.name`)}
              />
            </Input.Wrapper>
          </Input.Root>
          <Input.Root className='w-20'>
            <Input.Wrapper>
              <Input.Input
                type='number'
                min={1}
                placeholder='Qtd'
                {...register(`items.${nestIndex}.supplies.${sIdx}.quantity`)}
              />
            </Input.Wrapper>
          </Input.Root>
          <button
            type='button'
            onClick={() => remove(sIdx)}
            className='shrink-0 text-state-error-base hover:opacity-70'
          >
            <i className='ri-close-line' />
          </button>
        </div>
      ))}
    </div>
  );
}

export function OrderForm({
  onSubmit,
  isSubmitting,
  clients = [],
  paymentMethods = [],
  carriers = [],
  priceTables = [],
  products = [],
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientId: '',
      title: '',
      proposalValidityDays: 7,
      freightCents: 0,
      discountCents: 0,
      shouldProduce: false,
      isResale: false,
      hasTaxSubstitution: false,
      items: [{ productId: '', quantity: 1, unitPriceCents: 0, discountCents: 0, supplies: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  function handleFormSubmit(data: OrderFormData) {
    const payload: CreateOrderPayload = {
      clientId: data.clientId,
      title: data.title || undefined,
      paymentMethodId: data.paymentMethodId || undefined,
      carrierId: data.carrierId || undefined,
      priceTableId: data.priceTableId || undefined,
      deliveryDeadline: data.deliveryDeadline || undefined,
      proposalValidityDays: data.proposalValidityDays,
      deliveryAddress: data.deliveryAddress || undefined,
      deliveryNeighborhood: data.deliveryNeighborhood || undefined,
      deliveryCity: data.deliveryCity || undefined,
      deliveryState: data.deliveryState || undefined,
      deliveryCep: data.deliveryCep || undefined,
      deliveryReferencePoint: data.deliveryReferencePoint || undefined,
      contactName: data.contactName || undefined,
      freightCents: data.freightCents,
      discountCents: data.discountCents,
      shouldProduce: data.shouldProduce,
      isResale: data.isResale,
      hasTaxSubstitution: data.hasTaxSubstitution,
      notes: data.notes || undefined,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        discountCents: item.discountCents,
        pieces: item.pieces,
        size: item.size,
        supplies: item.supplies?.filter((s) => s.name.trim()).map((s) => ({
          name: s.name,
          productId: s.productId,
          quantity: s.quantity,
        })),
      })),
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>Novo Pedido</h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Crie um orcamento/pedido
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Link href='/comercial/pedidos'>
            <Button.Root variant='neutral' mode='stroke' size='small'>
              Cancelar
            </Button.Root>
          </Link>
          <Button.Root
            type='submit'
            variant='primary'
            mode='filled'
            size='small'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Criar Pedido'}
          </Button.Root>
        </div>
      </div>

      {/* Client selection */}
      <fieldset className='rounded-xl border border-stroke-soft-200 p-5'>
        <legend className='text-label-md text-text-strong-950 px-2'>Cliente</legend>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label.Root>Cliente *</Label.Root>
            <Controller
              name='clientId'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='Selecione o cliente' />
                  </Select.Trigger>
                  <Select.Content>
                    {clients.map((c) => (
                      <Select.Item key={c.id} value={c.id}>{c.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
            {errors.clientId && <Hint.Root hasError>{errors.clientId.message}</Hint.Root>}
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='title'>Titulo do pedido</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='title' placeholder='Ex: Marcelo - TR25' {...register('title')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </div>
      </fieldset>

      {/* Commercial info */}
      <fieldset className='rounded-xl border border-stroke-soft-200 p-5'>
        <legend className='text-label-md text-text-strong-950 px-2'>Informacoes Comerciais</legend>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='space-y-1.5'>
            <Label.Root>Forma de pagamento</Label.Root>
            <Controller
              name='paymentMethodId'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='Selecione' />
                  </Select.Trigger>
                  <Select.Content>
                    {paymentMethods.map((pm) => (
                      <Select.Item key={pm.id} value={pm.id}>{pm.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
          </div>
          <div className='space-y-1.5'>
            <Label.Root>Transportadora</Label.Root>
            <Controller
              name='carrierId'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='Selecione' />
                  </Select.Trigger>
                  <Select.Content>
                    {carriers.map((c) => (
                      <Select.Item key={c.id} value={c.id}>{c.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
          </div>
          <div className='space-y-1.5'>
            <Label.Root>Tabela de preco</Label.Root>
            <Controller
              name='priceTableId'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='Selecione' />
                  </Select.Trigger>
                  <Select.Content>
                    {priceTables.map((pt) => (
                      <Select.Item key={pt.id} value={pt.id}>{pt.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='deliveryDeadline'>Prazo de entrega</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='deliveryDeadline' type='date' {...register('deliveryDeadline')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='proposalValidityDays'>Validade proposta (dias)</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='proposalValidityDays' type='number' {...register('proposalValidityDays')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='freightCents'>Frete (centavos)</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='freightCents' type='number' {...register('freightCents')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </div>
        <div className='mt-4 flex flex-wrap items-center gap-6'>
          <Controller
            name='shouldProduce'
            control={control}
            render={({ field }) => (
              <label className='flex items-center gap-2 text-label-sm'>
                <Switch.Root checked={field.value} onCheckedChange={field.onChange} />
                Produzir
              </label>
            )}
          />
          <Controller
            name='isResale'
            control={control}
            render={({ field }) => (
              <label className='flex items-center gap-2 text-label-sm'>
                <Switch.Root checked={field.value} onCheckedChange={field.onChange} />
                Revenda
              </label>
            )}
          />
          <Controller
            name='hasTaxSubstitution'
            control={control}
            render={({ field }) => (
              <label className='flex items-center gap-2 text-label-sm'>
                <Switch.Root checked={field.value} onCheckedChange={field.onChange} />
                Substituicao Tributaria
              </label>
            )}
          />
        </div>
      </fieldset>

      {/* Delivery info */}
      <fieldset className='rounded-xl border border-stroke-soft-200 p-5'>
        <legend className='text-label-md text-text-strong-950 px-2'>Entrega</legend>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='space-y-1.5 md:col-span-2'>
            <Label.Root htmlFor='deliveryAddress'>Endereco</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='deliveryAddress' {...register('deliveryAddress')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='deliveryNeighborhood'>Bairro</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='deliveryNeighborhood' {...register('deliveryNeighborhood')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='deliveryCity'>Cidade</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='deliveryCity' {...register('deliveryCity')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root>UF</Label.Root>
            <Controller
              name='deliveryState'
              control={control}
              render={({ field }) => (
                <Select.Root value={field.value || undefined} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder='UF' />
                  </Select.Trigger>
                  <Select.Content>
                    {STATES.map((uf) => (
                      <Select.Item key={uf} value={uf}>{uf}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              )}
            />
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='deliveryCep'>CEP</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='deliveryCep' {...register('deliveryCep')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='deliveryReferencePoint'>Ponto de referencia</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='deliveryReferencePoint' {...register('deliveryReferencePoint')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
          <div className='space-y-1.5'>
            <Label.Root htmlFor='contactName'>Nome do contato</Label.Root>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input id='contactName' {...register('contactName')} />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className='rounded-xl border border-stroke-soft-200 p-5'>
        <legend className='text-label-md text-text-strong-950 px-2'>Itens do Pedido *</legend>
        <div className='flex flex-col gap-4'>
          {fields.map((field, index) => (
            <div key={field.id} className='flex flex-col gap-3 rounded-lg border border-stroke-soft-200 p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-label-sm text-text-sub-600'>Item {index + 1}</span>
                {fields.length > 1 && (
                  <button type='button' onClick={() => remove(index)} className='text-state-error-base hover:opacity-70'>
                    <i className='ri-delete-bin-line' />
                  </button>
                )}
              </div>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
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
                      <Input.Input type='number' step='0.01' {...register(`items.${index}.quantity`)} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='space-y-1.5'>
                  <Label.Root>Preco unit. (centavos) *</Label.Root>
                  <Input.Root>
                    <Input.Wrapper>
                      <Input.Input type='number' {...register(`items.${index}.unitPriceCents`)} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='space-y-1.5'>
                  <Label.Root>Pecas</Label.Root>
                  <Input.Root>
                    <Input.Wrapper>
                      <Input.Input type='number' step='0.1' {...register(`items.${index}.pieces`)} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='space-y-1.5'>
                  <Label.Root>Tamanho</Label.Root>
                  <Input.Root>
                    <Input.Wrapper>
                      <Input.Input type='number' step='0.01' {...register(`items.${index}.size`)} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
                <div className='space-y-1.5'>
                  <Label.Root>Desconto (centavos)</Label.Root>
                  <Input.Root>
                    <Input.Wrapper>
                      <Input.Input type='number' {...register(`items.${index}.discountCents`)} />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </div>

              {/* Supplies per item (Fix #2) */}
              <ItemSuppliesField nestIndex={index} control={control} register={register} />
            </div>
          ))}

          {errors.items?.root && <Hint.Root hasError>{errors.items.root.message}</Hint.Root>}
          {errors.items?.message && <Hint.Root hasError>{errors.items.message}</Hint.Root>}

          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => append({ productId: '', quantity: 1, unitPriceCents: 0, discountCents: 0, supplies: [] })}
          >
            <Button.Icon as='i' className='ri-add-line' />
            Adicionar item
          </Button.Root>
        </div>
      </fieldset>

      {/* Notes */}
      <fieldset className='rounded-xl border border-stroke-soft-200 p-5'>
        <legend className='text-label-md text-text-strong-950 px-2'>Observacoes</legend>
        <textarea
          {...register('notes')}
          rows={4}
          className='w-full rounded-lg border border-stroke-soft-200 px-3 py-2 text-paragraph-sm focus:border-primary-base focus:outline-none'
          placeholder='Observacoes internas do pedido...'
        />
      </fieldset>
    </form>
  );
}
