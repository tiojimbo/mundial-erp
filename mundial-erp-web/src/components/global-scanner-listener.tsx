'use client';

import { useEffect, useCallback, useRef } from 'react';
import { stockRequisitionService } from '@/features/stock-requisitions/services/stock-requisition.service';
import { notification } from '@/hooks/use-notification';
import { useQueryClient } from '@tanstack/react-query';
import { REQUISITIONS_KEY } from '@/features/stock-requisitions/hooks/use-stock-requisitions';

const REQ_CODE_PATTERN = /^REQ-\d{8}-\d{3}$/;

export function GlobalScannerListener() {
  const queryClient = useQueryClient();
  const isProcessing = useRef(false);

  const handleScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!REQ_CODE_PATTERN.test(trimmed)) return;
    if (isProcessing.current) return;

    isProcessing.current = true;
    try {
      const data = await stockRequisitionService.getByCode(trimmed);

      if (data.status === 'PROCESSED') {
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
      queryClient.invalidateQueries({ queryKey: REQUISITIONS_KEY });

      notification({
        title: 'Requisicao aprovada e processada',
        description: `${processed.code} — ${processed.items.length} itens processados, estoque atualizado.`,
        status: 'success',
      });
    } catch {
      notification({
        title: 'Erro ao processar requisicao',
        description: `Nao foi possivel processar a requisicao "${trimmed}".`,
        status: 'error',
      });
    } finally {
      isProcessing.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setup() {
      try {
        const onScan = (await import('onscan.js')).default;

        if (onScan.isAttachedTo(document)) {
          onScan.detachFrom(document);
        }

        onScan.attachTo(document, {
          minLength: 8,
          suffixKeyCodes: [13],
          onScan: (scanned: string) => {
            handleScan(scanned);
          },
        });

        cleanup = () => {
          if (onScan.isAttachedTo(document)) {
            onScan.detachFrom(document);
          }
        };
      } catch {
        // onScan.js not available
      }
    }

    setup();
    return () => cleanup?.();
  }, [handleScan]);

  return null;
}
