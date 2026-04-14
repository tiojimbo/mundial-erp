import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { notification } from '@/hooks/use-notification';
import { priceTableService } from '../services/price-table.service';
import type {
  CreatePriceTablePayload,
  UpdatePriceTablePayload,
} from '../types/price-table.types';

export const PRICE_TABLES_KEY = ['price-tables'];

export function usePriceTables() {
  return useQuery({
    queryKey: PRICE_TABLES_KEY,
    queryFn: () => priceTableService.getAll(),
  });
}

export function usePriceTable(id: string) {
  return useQuery({
    queryKey: [...PRICE_TABLES_KEY, id],
    queryFn: () => priceTableService.getById(id),
    enabled: !!id,
  });
}

export function useCreatePriceTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePriceTablePayload) =>
      priceTableService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICE_TABLES_KEY });
      notification({
        status: 'success',
        title: 'Tabela criada',
        description: 'A tabela de preço foi criada com sucesso.',
      });
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao criar',
        description:
          error.message || 'Não foi possível criar a tabela de preço.',
      });
    },
  });
}

export function useUpdatePriceTable(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePriceTablePayload) =>
      priceTableService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICE_TABLES_KEY });
      notification({
        status: 'success',
        title: 'Tabela atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao atualizar',
        description:
          error.message || 'Não foi possível atualizar a tabela de preço.',
      });
    },
  });
}

export function useDeletePriceTable() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => priceTableService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICE_TABLES_KEY });
      notification({
        status: 'success',
        title: 'Tabela excluída',
        description: 'A tabela de preço foi removida com sucesso.',
      });
      router.push('/compras/tabelas-preco');
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao excluir',
        description:
          error.message || 'Não foi possível excluir a tabela de preço.',
      });
    },
  });
}

export function useBulkUpdatePriceTableItems(tableId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { itemId: string; priceInCents: number }[]) =>
      priceTableService.bulkUpdateItems(tableId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...PRICE_TABLES_KEY, tableId] });
      notification({
        status: 'success',
        title: 'Preços atualizados',
        description: 'Os preços foram atualizados com sucesso.',
      });
    },
    onError: (error) => {
      notification({
        status: 'error',
        title: 'Erro ao salvar preços',
        description:
          error.message || 'Não foi possível atualizar os preços.',
      });
    },
  });
}
