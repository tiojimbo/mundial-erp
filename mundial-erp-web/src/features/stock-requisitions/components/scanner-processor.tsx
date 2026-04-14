'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Table from '@/components/ui/table';
import { RequisitionStatusBadge } from './requisition-status-badge';
import { REQUISITIONS_KEY } from '../hooks/use-stock-requisitions';
import { stockRequisitionService } from '../services/stock-requisition.service';
import { useNotification } from '@/hooks/use-notification';
import { useQueryClient } from '@tanstack/react-query';
import type { StockRequisition } from '../types/stock-requisition.types';

export function ScannerProcessor() {
  const { notification } = useNotification();
  const queryClient = useQueryClient();

  const [requisition, setRequisition] = useState<StockRequisition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  async function processRequisition(code: string) {
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const data = await stockRequisitionService.getByCode(code.trim());

      if (data.status === 'PROCESSED') {
        setRequisition(data);
        notification({
          title: 'Requisicao ja processada',
          description: `Requisicao ${data.code} ja foi processada anteriormente.`,
          status: 'error',
        });
        return;
      }

      if (data.status === 'CANCELLED') {
        notification({
          title: 'Requisicao cancelada',
          description: `Requisicao ${data.code} foi cancelada.`,
          status: 'error',
        });
        return;
      }

      if (data.status !== 'PENDING') {
        notification({
          title: 'Status invalido',
          description: `Requisicao ${data.code} esta com status "${data.status}".`,
          status: 'error',
        });
        return;
      }

      const processed = await stockRequisitionService.approve(data.id);
      setRequisition(processed);
      queryClient.invalidateQueries({ queryKey: REQUISITIONS_KEY });

      notification({
        title: 'Requisicao aprovada e processada',
        description: `${processed.code} — ${processed.items.length} itens processados, estoque atualizado.`,
        status: 'success',
      });
    } catch {
      notification({
        title: 'Requisicao nao encontrada',
        description: `Nenhuma requisicao encontrada com o codigo "${code}".`,
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setRequisition(null);
    fallbackInputRef.current?.focus();
  }

  function handleFallbackInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        processRequisition(value);
        (e.target as HTMLInputElement).value = '';
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const value = e.clipboardData.getData('text').trim();
    if (value) {
      e.preventDefault();
      processRequisition(value);
      (e.target as HTMLInputElement).value = '';
    }
  }

  const isProcessed = requisition?.status === 'PROCESSED';

  return (
    <div className='flex flex-col gap-5'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-3'>
          <Link
            href='/compras/requisicoes'
            className='rounded-lg p-1.5 text-text-sub-600 hover:bg-bg-weak-50'
          >
            <i className='ri-arrow-left-line text-xl' />
          </Link>
          <div>
            <h1 className='text-title-h5 text-text-strong-950'>Processar Requisicao</h1>
            <p className='text-paragraph-sm text-text-sub-600'>
              Escaneie o codigo de barras da requisicao em qualquer tela, ou cole o codigo abaixo
            </p>
          </div>
        </div>
      </div>

      {/* Scanner area */}
      <div className='rounded-xl border-2 border-dashed border-stroke-soft-200 bg-bg-white-0 p-6'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
            isProcessed
              ? 'bg-green-50 text-green-500'
              : 'bg-bg-weak-50 text-text-soft-400'
          }`}>
            <i className={`text-3xl ${
              isProcessed ? 'ri-checkbox-circle-line' : 'ri-barcode-line'
            }`} />
          </div>

          {!requisition && !isLoading && (
            <div>
              <p className='text-label-md text-text-strong-950'>
                Escaneie o codigo da requisicao
              </p>
              <p className='text-paragraph-sm text-text-sub-600'>
                O leitor de codigo de barras funciona em qualquer tela do sistema.
                Use o campo abaixo para entrada manual.
              </p>
            </div>
          )}

          {isLoading && (
            <div className='flex items-center gap-2 text-paragraph-sm text-text-sub-600'>
              <i className='ri-loader-4-line animate-spin' />
              Processando requisicao...
            </div>
          )}

          {isProcessed && (
            <div>
              <p className='text-label-md text-state-success-base'>
                Requisicao {requisition.code} aprovada e processada!
              </p>
              <p className='text-paragraph-sm text-text-sub-600'>
                Todos os itens foram processados e o estoque foi atualizado.
              </p>
            </div>
          )}

          {/* Fallback input */}
          {!isProcessed && (
            <div className='w-full max-w-md'>
              <Label.Root className='text-paragraph-xs text-text-soft-400'>
                Cole o codigo aqui (Ctrl+V) e pressione Enter
              </Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    ref={fallbackInputRef}
                    placeholder='Cole o codigo da requisicao...'
                    onKeyDown={handleFallbackInput}
                    onPaste={handlePaste}
                    autoFocus
                    disabled={isLoading}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>
          )}

          {isProcessed && (
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={handleReset}
            >
              <Button.Icon as='i' className='ri-barcode-line' />
              Processar outra requisicao
            </Button.Root>
          )}
        </div>
      </div>

      {/* Result */}
      {requisition && (
        <>
          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5 shadow-regular-xs'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='text-label-md text-text-strong-950'>{requisition.code}</span>
                  <RequisitionStatusBadge status={requisition.status} />
                </div>
                <p className='text-paragraph-xs text-text-soft-400'>
                  Solicitante: {requisition.requestedByName ?? '-'}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-label-sm text-text-strong-950'>
                  {requisition.items.length} itens
                </p>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'>
            <div className='border-b border-stroke-soft-200 px-5 py-3'>
              <h2 className='text-label-md text-text-strong-950'>Itens da Requisicao</h2>
            </div>
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Codigo</Table.Head>
                  <Table.Head>Produto</Table.Head>
                  <Table.Head className='text-center'>Unidade</Table.Head>
                  <Table.Head className='text-right'>Quantidade</Table.Head>
                  <Table.Head className='text-center'>Status</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {requisition.items.map((item) => (
                  <Table.Row
                    key={item.id}
                    className={item.processed ? 'bg-green-50/50' : ''}
                  >
                    <Table.Cell className='font-mono text-paragraph-xs text-text-sub-600'>
                      {item.productCode ?? '-'}
                    </Table.Cell>
                    <Table.Cell className='text-text-strong-950'>
                      {item.productName ?? '-'}
                    </Table.Cell>
                    <Table.Cell className='text-center text-text-sub-600'>
                      {item.unitType}
                    </Table.Cell>
                    <Table.Cell className='text-right text-text-sub-600'>
                      {item.requestedQuantity}
                    </Table.Cell>
                    <Table.Cell className='text-center'>
                      {item.processed ? (
                        <span className='inline-flex items-center gap-1 text-paragraph-xs text-state-success-base'>
                          <i className='ri-check-line' /> Baixa realizada
                        </span>
                      ) : (
                        <span className='text-paragraph-xs text-text-soft-400'>Pendente</span>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </>
      )}
    </div>
  );
}
