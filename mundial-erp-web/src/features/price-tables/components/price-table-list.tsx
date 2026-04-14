'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiPriceTag3Line,
  RiCheckLine,
  RiCloseLine,
  RiStarFill,
} from '@remixicon/react';

import * as Table from '@/components/ui/table';
import * as Button from '@/components/ui/button';
import * as Badge from '@/components/ui/badge';
import * as Input from '@/components/ui/input';
import * as Modal from '@/components/ui/modal';
import * as Label from '@/components/ui/label';
import {
  usePriceTables,
  useCreatePriceTable,
  useDeletePriceTable,
} from '../hooks/use-price-tables';

export function PriceTableList() {
  const { data: tables, isLoading } = usePriceTables();
  const createMutation = useCreatePriceTable();
  const deleteMutation = useDeletePriceTable();

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate(
      { name: newName.trim() },
      {
        onSuccess: () => {
          setNewName('');
          setModalOpen(false);
        },
      },
    );
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Tem certeza que deseja excluir a tabela "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-title-h5 text-text-strong-950'>
            Tabelas de Preço
          </h1>
          <p className='text-paragraph-sm text-text-sub-600'>
            Gerencie as tabelas de preço dos produtos.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Modal.Root open={modalOpen} onOpenChange={setModalOpen}>
            <Modal.Trigger asChild>
              <Button.Root variant='primary' mode='filled' size='medium'>
                <Button.Icon as={RiAddLine} />
                Nova Tabela
              </Button.Root>
            </Modal.Trigger>
            <Modal.Content>
              <Modal.Header
                icon={RiPriceTag3Line}
                title='Nova Tabela de Preço'
                description='Informe o nome da nova tabela de preço.'
              />
              <Modal.Body>
                <div className='space-y-1.5'>
                  <Label.Root htmlFor='new-table-name'>
                    Nome da tabela
                    <Label.Asterisk />
                  </Label.Root>
                  <Input.Root size='medium'>
                    <Input.Wrapper>
                      <Input.Input
                        id='new-table-name'
                        placeholder='Ex: Tabela Varejo'
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreate();
                        }}
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Modal.Close asChild>
                  <Button.Root variant='neutral' mode='stroke' size='small'>
                    <Button.Icon as={RiCloseLine} />
                    Cancelar
                  </Button.Root>
                </Modal.Close>
                <Button.Root
                  variant='primary'
                  mode='filled'
                  size='small'
                  onClick={handleCreate}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  <Button.Icon as={RiCheckLine} />
                  {createMutation.isPending ? 'Criando...' : 'Criar Tabela'}
                </Button.Root>
              </Modal.Footer>
            </Modal.Content>
          </Modal.Root>
        </div>
      </div>

      {/* Table */}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Nome</Table.Head>
              <Table.Head>Padrão</Table.Head>
              <Table.Head>Qtd Itens</Table.Head>
              <Table.Head className='text-right'>Ações</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Table.Row key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <Table.Cell key={j}>
                      <div className='h-4 w-24 animate-pulse rounded bg-bg-weak-50' />
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))
            ) : !tables || tables.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4} className='text-center'>
                  <p className='py-8 text-paragraph-sm text-text-soft-400'>
                    Nenhuma tabela de preço cadastrada.
                  </p>
                </Table.Cell>
              </Table.Row>
            ) : (
              tables.map((table) => (
                <Table.Row key={table.id}>
                  <Table.Cell>
                    <Link
                      href={`/compras/tabelas-preco/${table.id}`}
                      className='text-label-sm text-text-strong-950 transition hover:text-primary-base'
                    >
                      {table.name}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    {table.isDefault ? (
                      <Badge.Root
                        variant='lighter'
                        color='green'
                        size='small'
                      >
                        <Badge.Icon as={RiStarFill} />
                        Padrão
                      </Badge.Root>
                    ) : (
                      <span className='text-paragraph-sm text-text-soft-400'>
                        —
                      </span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <span className='text-paragraph-sm text-text-sub-600'>
                      {table.items?.length ?? 0}
                    </span>
                  </Table.Cell>
                  <Table.Cell className='text-right'>
                    <div className='flex items-center justify-end gap-1'>
                      <Button.Root
                        asChild
                        variant='neutral'
                        mode='ghost'
                        size='xxsmall'
                      >
                        <Link href={`/compras/tabelas-preco/${table.id}`}>
                          <Button.Icon as={RiEditLine} />
                        </Link>
                      </Button.Root>
                      <Button.Root
                        variant='error'
                        mode='ghost'
                        size='xxsmall'
                        onClick={() => handleDelete(table.id, table.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Button.Icon as={RiDeleteBinLine} />
                      </Button.Root>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
    </div>
  );
}
