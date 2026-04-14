'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiSearchLine,
  RiCheckLine,
  RiCloseLine,
  RiStarLine,
  RiStarFill,
  RiLoader4Line,
  RiEditLine,
  RiPriceTag3Line,
} from '@remixicon/react';
import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import { formatCents } from '@/lib/formatters';
import {
  usePriceTable,
  useUpdatePriceTable,
  useBulkUpdatePriceTableItems,
} from '../hooks/use-price-tables';

type Props = {
  tableId: string;
};

export function PriceTableEditor({ tableId }: Props) {
  const { data: table, isLoading } = usePriceTable(tableId);
  const updateMutation = useUpdatePriceTable(tableId);
  const updateItemsMutation = useBulkUpdatePriceTableItems(tableId);

  const [search, setSearch] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});

  // Sync name when table loads
  useEffect(() => {
    if (table?.name) {
      setNameValue(table.name);
    }
  }, [table?.name]);

  // Reset edited prices when table data refreshes
  useEffect(() => {
    setEditedPrices({});
  }, [table?.updatedAt]);

  const filteredItems = useMemo(() => {
    if (!table?.items) return [];
    if (!search.trim()) return table.items;
    const lower = search.toLowerCase();
    return table.items.filter(
      (item) =>
        item.product?.name.toLowerCase().includes(lower) ||
        item.product?.code.toLowerCase().includes(lower),
    );
  }, [table?.items, search]);

  const dirtyItemIds = useMemo(() => {
    if (!table?.items) return new Set<string>();
    const dirty = new Set<string>();
    for (const item of table.items) {
      const edited = editedPrices[item.productId];
      if (edited !== undefined) {
        const editedCents = parseCentsInput(edited);
        if (editedCents !== null && editedCents !== item.priceInCents) {
          dirty.add(item.productId);
        }
      }
    }
    return dirty;
  }, [table?.items, editedPrices]);

  const hasDirtyItems = dirtyItemIds.size > 0;

  const handleSaveName = useCallback(() => {
    if (!nameValue.trim() || nameValue.trim() === table?.name) {
      setEditingName(false);
      setNameValue(table?.name ?? '');
      return;
    }
    updateMutation.mutate(
      { name: nameValue.trim() },
      { onSuccess: () => setEditingName(false) },
    );
  }, [nameValue, table?.name, updateMutation]);

  const handleToggleDefault = useCallback(() => {
    if (!table) return;
    updateMutation.mutate({ isDefault: !table.isDefault });
  }, [table, updateMutation]);

  const handlePriceChange = useCallback(
    (productId: string, value: string) => {
      setEditedPrices((prev) => ({ ...prev, [productId]: value }));
    },
    [],
  );

  const handleUndoItem = useCallback(
    (productId: string) => {
      setEditedPrices((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    [],
  );

  const handleBulkSave = useCallback(() => {
    if (!table?.items) return;

    const payload: { itemId: string; priceInCents: number }[] = [];
    for (const item of table.items) {
      const edited = editedPrices[item.productId];
      if (edited !== undefined) {
        const editedCents = parseCentsInput(edited);
        if (editedCents !== null && editedCents !== item.priceInCents) {
          payload.push({ itemId: item.id, priceInCents: editedCents });
        }
      }
    }

    if (payload.length > 0) {
      updateItemsMutation.mutate(payload);
    }
  }, [table?.items, editedPrices, updateItemsMutation]);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='h-8 w-64 animate-pulse rounded bg-bg-weak-50' />
        <div className='h-6 w-40 animate-pulse rounded bg-bg-weak-50' />
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='h-12 w-full animate-pulse rounded bg-bg-weak-50'
            />
          ))}
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className='py-12 text-center'>
        <p className='text-paragraph-sm text-text-soft-400'>
          Tabela de preço não encontrada.
        </p>
        <Button.Root asChild variant='neutral' mode='stroke' size='small'>
          <Link href='/compras/tabelas-preco' className='mt-4 inline-flex'>
            <Button.Icon as={RiArrowLeftLine} />
            Voltar
          </Link>
        </Button.Root>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-3'>
          <Button.Root asChild variant='neutral' mode='ghost' size='xsmall'>
            <Link href='/compras/tabelas-preco'>
              <Button.Icon as={RiArrowLeftLine} />
            </Link>
          </Button.Root>

          {editingName ? (
            <div className='flex items-center gap-2'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setEditingName(false);
                        setNameValue(table.name);
                      }
                    }}
                    autoFocus
                  />
                </Input.Wrapper>
              </Input.Root>
              <Button.Root
                variant='primary'
                mode='ghost'
                size='xxsmall'
                onClick={handleSaveName}
                disabled={updateMutation.isPending}
              >
                <Button.Icon as={RiCheckLine} />
              </Button.Root>
              <Button.Root
                variant='neutral'
                mode='ghost'
                size='xxsmall'
                onClick={() => {
                  setEditingName(false);
                  setNameValue(table.name);
                }}
              >
                <Button.Icon as={RiCloseLine} />
              </Button.Root>
            </div>
          ) : (
            <button
              className='group flex items-center gap-2'
              onClick={() => setEditingName(true)}
            >
              <h1 className='text-title-h5 text-text-strong-950'>
                {table.name}
              </h1>
              <RiEditLine className='size-4 text-text-soft-400 opacity-0 transition group-hover:opacity-100' />
            </button>
          )}

          {table.isDefault && (
            <Badge.Root variant='lighter' color='green' size='small'>
              <Badge.Icon as={RiStarFill} />
              Padrão
            </Badge.Root>
          )}
        </div>

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2'>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleToggleDefault}
              disabled={updateMutation.isPending}
            >
              <Button.Icon as={table.isDefault ? RiStarFill : RiStarLine} />
              {table.isDefault
                ? 'Remover como Padrão'
                : 'Definir como Padrão'}
            </Button.Root>
          </div>

          <div className='flex items-center gap-2'>
            <div className='w-full sm:w-72'>
              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Icon as={RiSearchLine} />
                  <Input.Input
                    placeholder='Buscar produto...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={handleBulkSave}
              disabled={!hasDirtyItems || updateItemsMutation.isPending}
            >
              {updateItemsMutation.isPending ? (
                <RiLoader4Line className='size-4 animate-spin' />
              ) : (
                <Button.Icon as={RiPriceTag3Line} />
              )}
              Salvar Alterações
              {hasDirtyItems && (
                <Badge.Root
                  variant='filled'
                  color='red'
                  size='small'
                  className='ml-1'
                >
                  {dirtyItemIds.size}
                </Badge.Root>
              )}
            </Button.Root>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Código</Table.Head>
            <Table.Head>Produto</Table.Head>
            <Table.Head>Preço Anterior</Table.Head>
            <Table.Head>Novo Preço</Table.Head>
            <Table.Head className='text-right'>Ações</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filteredItems.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5} className='text-center'>
                <p className='py-8 text-paragraph-sm text-text-soft-400'>
                  {search
                    ? 'Nenhum item encontrado para esta busca.'
                    : 'Nenhum item nesta tabela de preço.'}
                </p>
              </Table.Cell>
            </Table.Row>
          ) : (
            filteredItems.map((item) => {
              const isDirty = dirtyItemIds.has(item.productId);
              const editedValue = editedPrices[item.productId];
              const displayValue =
                editedValue !== undefined
                  ? editedValue
                  : centsToDisplayValue(item.priceInCents);

              return (
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <span className='font-mono text-label-sm text-text-strong-950'>
                      {item.product?.code ?? '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {item.product?.name ?? '—'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {formatCents(item.priceInCents)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className='w-36'>
                      <Input.Root
                        size='xsmall'
                        hasError={
                          editedValue !== undefined &&
                          parseCentsInput(editedValue) === null
                        }
                      >
                        <Input.Wrapper>
                          <Input.InlineAffix>R$</Input.InlineAffix>
                          <Input.Input
                            value={displayValue}
                            onChange={(e) =>
                              handlePriceChange(
                                item.productId,
                                e.target.value,
                              )
                            }
                            placeholder='0,00'
                          />
                        </Input.Wrapper>
                      </Input.Root>
                    </div>
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <div className='flex items-center justify-end gap-1'>
                      {isDirty && (
                        <Button.Root
                          variant='neutral'
                          mode='ghost'
                          size='xxsmall'
                          onClick={() => handleUndoItem(item.productId)}
                        >
                          <Button.Icon as={RiCloseLine} />
                        </Button.Root>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            })
          )}
        </Table.Body>
      </Table.Root>
    </div>
  );
}

/**
 * Converts cents to a display string like "12,50"
 */
function centsToDisplayValue(cents: number): string {
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  return `${reais},${centavos.toString().padStart(2, '0')}`;
}

/**
 * Parses a user-entered price string (Brazilian format) into cents.
 * Accepts formats like "12,50", "12.50", "12", "1250"
 * Returns null if the input is not a valid number.
 */
function parseCentsInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Remove thousands separators (dots) then replace comma with dot
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);

  if (isNaN(num) || num < 0) return null;

  return Math.round(num * 100);
}
